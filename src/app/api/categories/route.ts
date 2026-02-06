import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Category from '@/lib/mongodb/models/Category';
import { categorySchema } from '@/lib/validations/category';
import { categoriesCache, userCacheKey } from '@/lib/cache/lru-cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Check cache first
    const cacheKey = userCacheKey(session.user.id, 'categories', type || 'all', String(includeInactive));
    const cached = categoriesCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { success: true, data: cached },
        {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    await connectToDatabase();

    const query: Record<string, unknown> = { userId: session.user.id };
    if (type) {
      query.type = type;
    }
    if (!includeInactive) {
      query.isActive = true;
    }

    const categories = await Category.find(query)
      .sort({ name: 1 })
      .lean();

    const data = categories.map((c) => ({ ...c, _id: c._id.toString() }));
    
    // Store in cache
    categoriesCache.set(cacheKey, data);

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = categorySchema.parse(body);

    await connectToDatabase();

    const category = await Category.create({
      ...validatedData,
      userId: session.user.id,
      isActive: true,
    });

    // Invalidate user's category cache
    categoriesCache.invalidatePattern(session.user.id);

    return NextResponse.json(
      {
        success: true,
        data: { ...category.toObject(), _id: category._id.toString() },
        message: 'Category created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues.map((i: { message: string }) => i.message) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
