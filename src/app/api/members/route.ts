import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';
import { memberSchema } from '@/lib/validations/member';
import { membersCache, userCacheKey } from '@/lib/cache/lru-cache';

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
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Check cache first
    const cacheKey = userCacheKey(session.user.id, 'members', String(includeInactive));
    const cached = membersCache.get(cacheKey);
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
    if (!includeInactive) {
      query.isActive = true;
    }

    const members = await Member.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const data = members.map((m) => ({ ...m, _id: m._id.toString() }));
    
    // Store in cache
    membersCache.set(cacheKey, data);

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
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
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
    const validatedData = memberSchema.parse(body);

    await connectToDatabase();

    // Convert null dateOfBirth to undefined for MongoDB
    const memberData = {
      ...validatedData,
      dateOfBirth: validatedData.dateOfBirth ?? undefined,
      userId: session.user.id,
      isActive: true,
    };

    const member = await Member.create(memberData);

    // Invalidate user's members cache
    membersCache.invalidatePattern(session.user.id);

    return NextResponse.json(
      {
        success: true,
        data: { ...member.toObject(), _id: member._id.toString() },
        message: 'Member created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating member:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues.map((i: { message: string }) => i.message) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create member' },
      { status: 500 }
    );
  }
}
