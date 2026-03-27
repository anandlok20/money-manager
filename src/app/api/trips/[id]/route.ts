import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Trip from '@/lib/mongodb/models/Trip';
import Transaction from '@/lib/mongodb/models/Transaction';
import SplitExpense from '@/lib/mongodb/models/SplitExpense';
import { TransactionType } from '@/types';
import { z } from 'zod';
import { TripStatus } from '@/lib/mongodb/models/Trip';

// Traveler can be either a string (just name) or a full object
const travelerSchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    memberId: z.string().optional(),
    isOrganizer: z.boolean().optional(),
  }),
]);

const ticketSchema = z.object({
  type: z.enum(['flight', 'train', 'bus', 'other']),
  title: z.string().min(1),
  bookingReference: z.string().optional(),
  departureLocation: z.string().min(1),
  arrivalLocation: z.string().min(1),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  carrier: z.string().optional(),
  seatNumber: z.string().optional(),
  price: z.number().optional(),
  pdfUrl: z.string().optional(),
  notes: z.string().optional(),
});

const hotelSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  checkIn: z.string(),
  checkOut: z.string(),
  bookingReference: z.string().optional(),
  price: z.number().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  roomType: z.string().optional(),
  pdfUrl: z.string().optional(),
  notes: z.string().optional(),
});

const placeSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  address: z.string().optional(),
  plannedDate: z.string().optional(),
  estimatedDuration: z.string().optional(),
  estimatedCost: z.number().optional(),
  priority: z.string().optional(),
  visited: z.boolean().optional(),
  rating: z.number().optional(),
  notes: z.string().optional(),
});

const cabSchema = z.object({
  type: z.string(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  vehicleNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  pickupLocation: z.string().optional(),
  dropLocation: z.string().optional(),
  pickupTime: z.string().optional(),
  price: z.number().optional(),
  bookingReference: z.string().optional(),
  notes: z.string().optional(),
});

const updateTripSchema = z.object({
  isPrivate: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  destination: z.string().min(1).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  budget: z.number().positive().optional(),
  status: z.nativeEnum(TripStatus).optional(),
  coverImage: z.string().optional(),
  travelers: z.array(travelerSchema).optional(),
  tickets: z.array(ticketSchema).optional(),
  hotels: z.array(hotelSchema).optional(),
  placesToVisit: z.array(placeSchema).optional(),
  cabs: z.array(cabSchema).optional(),
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

    // Fetch splits for these transactions to use yourShare for expense calculation
    const transactionIds = transactions.map((t) => t._id);
    const splits = await SplitExpense.find({
      transactionId: { $in: transactionIds },
    }).lean();
    const splitMap = new Map(
      splits.map((s) => [s.transactionId.toString(), s.yourShare as number])
    );

    // Calculate totals (use yourShare for split expenses)
    let totalExpenses = 0;
    let totalIncome = 0;
    transactions.forEach((t) => {
      if (t.type === TransactionType.EXPENSE) {
        const effectiveAmount = splitMap.has(t._id.toString())
          ? splitMap.get(t._id.toString())!
          : t.amount;
        totalExpenses += effectiveAmount;
      }
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
          isSplit: splitMap.has(t._id.toString()),
          myShare: splitMap.get(t._id.toString()),
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
    if (validatedData.isPrivate !== undefined) {
      updateData.privateMemberId = validatedData.isPrivate ? (session.user.memberId || null) : null;
    }
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }
    // Normalize travelers - convert strings to objects
    if (validatedData.travelers) {
      updateData.travelers = validatedData.travelers.map((t) => 
        typeof t === 'string' ? { name: t } : t
      );
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
