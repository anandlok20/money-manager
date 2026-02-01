import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Budget from '@/lib/mongodb/models/Budget';
import { updateBudgetSchema } from '@/lib/validations/budget';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const budget = await Budget.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate('categoryId', 'name color type')
      .lean();

    if (!budget) {
      return NextResponse.json(
        { success: false, error: 'Budget not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...budget, _id: budget._id.toString() },
    });
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateBudgetSchema.parse(body);

    await connectToDatabase();

    const budget = await Budget.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: validatedData },
      { new: true }
    ).lean();

    if (!budget) {
      return NextResponse.json(
        { success: false, error: 'Budget not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...budget, _id: budget._id.toString() },
      message: 'Budget updated successfully',
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const budget = await Budget.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!budget) {
      return NextResponse.json(
        { success: false, error: 'Budget not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete budget' },
      { status: 500 }
    );
  }
}
