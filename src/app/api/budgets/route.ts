import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Budget from '@/lib/mongodb/models/Budget';
import { budgetSchema } from '@/lib/validations/budget';

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
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const query: Record<string, unknown> = { userId: session.user.id };
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const budgets = await Budget.find(query)
      .populate('categoryId', 'name color type')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: budgets.map((b) => ({
        ...b,
        _id: b._id.toString(),
        categoryId: typeof b.categoryId === 'object' ? {
          ...b.categoryId,
          _id: (b.categoryId as unknown as { _id: { toString(): string } })._id.toString(),
        } : b.categoryId,
      })),
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch budgets' },
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
    const validatedData = budgetSchema.parse(body);

    await connectToDatabase();

    // Check for existing budget for this category/month/year
    const existing = await Budget.findOne({
      userId: session.user.id,
      categoryId: validatedData.categoryId,
      month: validatedData.month,
      year: validatedData.year,
    });

    if (existing) {
      // Update existing budget
      existing.amount = validatedData.amount;
      await existing.save();
      
      return NextResponse.json({
        success: true,
        data: { ...existing.toObject(), _id: existing._id.toString() },
        message: 'Budget updated successfully',
      });
    }

    // Create new budget
    const budget = await Budget.create({
      ...validatedData,
      userId: session.user.id,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...budget.toObject(), _id: budget._id.toString() },
        message: 'Budget created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create budget' },
      { status: 500 }
    );
  }
}
