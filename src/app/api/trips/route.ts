import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Trip, { TripStatus } from '@/lib/mongodb/models/Trip';
import Transaction from '@/lib/mongodb/models/Transaction';
import { TransactionType } from '@/types';
import { z } from 'zod';
import { checkFeatureAccess } from '@/lib/utils/apiFeatureGate';

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

const tripSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  destination: z.string().min(1),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check feature access
    const featureBlock = await checkFeatureAccess(session.user.id, 'trips');
    if (featureBlock) return featureBlock;

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

    // Calculate expenses for each trip if requested - using single aggregation query
    if (includeStats && trips.length > 0) {
      const tripIds = trips.map(t => t._id);
      
      // Single aggregation query for all trips instead of N queries
      const tripStats = await Transaction.aggregate([
        {
          $match: {
            userId: session.user.id,
            tripId: { $in: tripIds },
            type: { $in: [TransactionType.EXPENSE, TransactionType.INCOME] },
          },
        },
        {
          $group: {
            _id: { tripId: '$tripId', type: '$type' },
            total: { $sum: '$amount' },
          },
        },
      ]);

      // Build a map of trip stats for O(1) lookup
      const statsMap = new Map<string, { expenses: number; income: number }>();
      tripStats.forEach((stat) => {
        const tripIdStr = stat._id.tripId.toString();
        if (!statsMap.has(tripIdStr)) {
          statsMap.set(tripIdStr, { expenses: 0, income: 0 });
        }
        const tripStat = statsMap.get(tripIdStr)!;
        if (stat._id.type === TransactionType.EXPENSE) {
          tripStat.expenses = stat.total;
        } else if (stat._id.type === TransactionType.INCOME) {
          tripStat.income = stat.total;
        }
      });

      // Map trips with their stats
      const tripsWithStats = trips.map((trip) => {
        const tripIdStr = trip._id.toString();
        const stats = statsMap.get(tripIdStr) || { expenses: 0, income: 0 };
        return {
          ...trip,
          _id: tripIdStr,
          totalExpenses: stats.expenses,
          totalIncome: stats.income,
        };
      });

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

    // Check feature access
    const featureBlock = await checkFeatureAccess(session.user.id, 'trips');
    if (featureBlock) return featureBlock;

    const body = await request.json();
    const validatedData = tripSchema.parse(body);

    await connectToDatabase();

    // Normalize travelers - convert strings to objects
    const normalizedTravelers = validatedData.travelers?.map((t) => 
      typeof t === 'string' ? { name: t } : t
    );

    const trip = await Trip.create({
      ...validatedData,
      travelers: normalizedTravelers,
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
