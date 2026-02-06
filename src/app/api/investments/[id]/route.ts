import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Investment from '@/lib/mongodb/models/Investment';
import Transaction from '@/lib/mongodb/models/Transaction';
import { updateInvestmentSchema } from '@/lib/validations/investment';

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

    const investment = await Investment.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!investment) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }

    // Get recent transactions for this investment
    const transactions = await Transaction.find({
      userId: session.user.id,
      destinationInvestmentId: id,
    })
      .sort({ dateTime: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...investment,
        _id: investment._id.toString(),
        recentTransactions: transactions.map((t) => ({
          ...t,
          _id: t._id.toString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching investment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch investment' },
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
    const validatedData = updateInvestmentSchema.parse(body);

    await connectToDatabase();

    const investment = await Investment.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: validatedData },
      { new: true }
    ).lean();

    if (!investment) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...investment, _id: investment._id.toString() },
      message: 'Investment updated successfully',
    });
  } catch (error) {
    console.error('Error updating investment:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues.map((i: { message: string }) => i.message) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update investment' },
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

    // Check if there are any transactions linked to this investment
    const transactionCount = await Transaction.countDocuments({
      userId: session.user.id,
      destinationInvestmentId: id,
    });

    if (transactionCount > 0) {
      // Soft delete - set isActive to false
      await Investment.findOneAndUpdate(
        { _id: id, userId: session.user.id },
        { $set: { isActive: false } }
      );

      return NextResponse.json({
        success: true,
        message: 'Investment deactivated (has linked transactions)',
      });
    }

    // Hard delete if no transactions
    const result = await Investment.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Investment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting investment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete investment' },
      { status: 500 }
    );
  }
}
