import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Trip from '@/lib/mongodb/models/Trip';
import Transaction from '@/lib/mongodb/models/Transaction';
import { TransactionType } from '@/types';
import { z } from 'zod';
import { TripStatus } from '@/lib/mongodb/models/Trip';

const updateTripSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  destination: z.string().min(1).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  budget: z.number().positive().optional(),
  status: z.nativeEnum(TripStatus).optional(),
  coverImage: z.string().optional(),
  travelers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

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

    const trip = await Trip.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!trip) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Get trip transactions
    const transactions = await Transaction.find({
      userId: session.user.id,
      tripId: id,
    })
      .populate('categoryId', 'name icon color')
      .sort({ dateTime: -1 })
      .lean();

    // Calculate totals
    let totalExpenses = 0;
    let totalIncome = 0;
    transactions.forEach((t) => {
      if (t.type === TransactionType.EXPENSE) totalExpenses += t.amount;
      if (t.type === TransactionType.INCOME) totalIncome += t.amount;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...trip,
        _id: trip._id.toString(),
        totalExpenses,
        totalIncome,
        transactions: transactions.map((t) => ({
          ...t,
          _id: t._id.toString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trip' },
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
    const validatedData = updateTripSchema.parse(body);

    await connectToDatabase();

    const updateData: Record<string, unknown> = { ...validatedData };
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }

    const trip = await Trip.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!trip) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...trip, _id: trip._id.toString() },
      message: 'Trip updated successfully',
    });
  } catch (error) {
    console.error('Error updating trip:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update trip' },
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

    // Check if trip has transactions
    const transactionCount = await Transaction.countDocuments({
      userId: session.user.id,
      tripId: id,
    });

    if (transactionCount > 0) {
      // Just unlink the trip from transactions instead of deleting
      await Transaction.updateMany(
        { userId: session.user.id, tripId: id },
        { $unset: { tripId: 1 } }
      );
    }

    const result = await Trip.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trip deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete trip' },
      { status: 500 }
    );
  }
}
