import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Investment from '@/lib/mongodb/models/Investment';
import { investmentSchema } from '@/lib/validations/investment';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: Record<string, unknown> = { userId: session.user.id };
    if (!includeInactive) {
      query.isActive = true;
    }

    const investments = await Investment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Calculate total value
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);

    return NextResponse.json(
      {
        success: true,
        data: investments.map((i) => ({ ...i, _id: i._id.toString() })),
        totalValue,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch investments' },
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
    const validatedData = investmentSchema.parse(body);

    await connectToDatabase();

    const investment = await Investment.create({
      ...validatedData,
      userId: session.user.id,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...investment.toObject(), _id: investment._id.toString() },
        message: 'Investment created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating investment:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues.map((i: { message: string }) => i.message) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create investment' },
      { status: 500 }
    );
  }
}
