import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Trip, { TripStatus } from '@/lib/mongodb/models/Trip';
import Transaction from '@/lib/mongodb/models/Transaction';
import { TransactionType } from '@/types';
import { z } from 'zod';

const tripSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  destination: z.string().min(1),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  budget: z.number().positive(),
  status: z.nativeEnum(TripStatus).optional(),
  coverImage: z.string().optional(),
  travelers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

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
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';

    const query: Record<string, unknown> = { userId: session.user.id };
    if (status) {
      // Support comma-separated statuses
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query.status = statuses[0];
      } else {
        query.status = { $in: statuses };
      }
    }

    const trips = await Trip.find(query)
      .sort({ startDate: -1 })
      .lean();

    // Calculate expenses for each trip if requested
    if (includeStats) {
      const tripsWithStats = await Promise.all(
        trips.map(async (trip) => {
          const transactions = await Transaction.aggregate([
            {
              $match: {
                userId: { $eq: session.user.id },
                tripId: trip._id,
                type: { $in: [TransactionType.EXPENSE, TransactionType.INCOME] },
              },
            },
            {
              $group: {
                _id: '$type',
                total: { $sum: '$amount' },
              },
            },
          ]);

          let totalExpenses = 0;
          let totalIncome = 0;
          transactions.forEach((t) => {
            if (t._id === TransactionType.EXPENSE) totalExpenses = t.total;
            if (t._id === TransactionType.INCOME) totalIncome = t.total;
          });

          return {
            ...trip,
            _id: trip._id.toString(),
            totalExpenses,
            totalIncome,
          };
        })
      );

      return NextResponse.json({ success: true, data: tripsWithStats });
    }

    return NextResponse.json({
      success: true,
      data: trips.map((t) => ({ ...t, _id: t._id.toString() })),
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trips' },
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
    const validatedData = tripSchema.parse(body);

    await connectToDatabase();

    const trip = await Trip.create({
      ...validatedData,
      userId: session.user.id,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...trip.toObject(), _id: trip._id.toString() },
        message: 'Trip created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating trip:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create trip' },
      { status: 500 }
    );
  }
}
