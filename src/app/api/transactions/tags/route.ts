import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Transaction from '@/lib/mongodb/models/Transaction';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get all unique tags used by this user
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);
    const result = await Transaction.aggregate([
      {
        $match: {
          userId: { $eq: userObjectId },
          tags: { $exists: true, $ne: [] },
        },
      },
      {
        $unwind: '$tags',
      },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 50,
      },
    ]);

    const tags = result.map((r) => ({
      tag: r._id,
      count: r.count,
    }));

    return NextResponse.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
