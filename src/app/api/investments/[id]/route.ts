import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Investment from '@/lib/mongodb/models/Investment';
import Transaction from '@/lib/mongodb/models/Transaction';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import { updateInvestmentSchema } from '@/lib/validations/investment';
import { sanitizeTextFields, validateObjectId, handleApiError } from '@/lib/utils/api';

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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const body = await request.json();
    const validatedData = updateInvestmentSchema.parse(body);
    const sanitizedData = sanitizeTextFields(validatedData as Record<string, unknown>);

    await connectToDatabase();

    const investment = await Investment.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: sanitizedData },
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
    return handleApiError(error, 'Failed to update investment');
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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

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

      // Deactivate linked scheduled payments
      await ScheduledPayment.updateMany(
        { userId: session.user.id, destinationInvestmentId: id },
        { $set: { isActive: false } }
      );

      return NextResponse.json({
        success: true,
        message: 'Investment deactivated (has linked transactions)',
      });
    }

    // Hard delete — also clean up references
    await ScheduledPayment.updateMany(
      { userId: session.user.id, destinationInvestmentId: id },
      { $set: { isActive: false } }
    );

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
