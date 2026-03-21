import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { startOfDay } from 'date-fns';
import { connectToDatabase } from '@/lib/mongodb/client';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import Investment from '@/lib/mongodb/models/Investment';
import Asset from '@/lib/mongodb/models/Asset';
import Vehicle from '@/lib/mongodb/models/Vehicle';
import { NetWorthSnapshot } from '@/lib/mongodb/models';
import User from '@/lib/mongodb/models/User';

// Called daily by cron to snapshot every active user's net worth
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET environment variable is not set');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const expected = `Bearer ${cronSecret}`;
    const provided = authHeader ?? '';
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    const isValid =
      expectedBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const today = startOfDay(new Date());

    // Get all active users
    const users = await User.find({}, '_id').lean();

    let snapshotCount = 0;
    const errors: { userId: string; error: string }[] = [];

    for (const user of users) {
      try {
        const userId = user._id.toString();
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const [bankTotal, cardTotal, investmentTotal, assetTotal, vehicleTotal] = await Promise.all([
          BankAccount.aggregate([
            { $match: { userId: { $eq: userObjectId }, isActive: true } },
            { $group: { _id: null, total: { $sum: '$currentBalance' } } },
          ]),
          Card.aggregate([
            { $match: { userId: { $eq: userObjectId }, isActive: true } },
            { $group: { _id: null, total: { $sum: '$currentBalance' } } },
          ]),
          Investment.aggregate([
            { $match: { userId: { $eq: userObjectId }, isActive: true } },
            { $group: { _id: null, total: { $sum: '$currentValue' } } },
          ]),
          Asset.aggregate([
            { $match: { userId: { $eq: userObjectId }, status: 'active' } },
            { $group: { _id: null, total: { $sum: '$currentValue' } } },
          ]),
          Vehicle.aggregate([
            { $match: { userId: { $eq: userObjectId }, status: 'active' } },
            {
              $group: {
                _id: null,
                value: { $sum: { $ifNull: ['$currentValue', 0] } },
                loans: { $sum: { $cond: ['$hasLoan', { $ifNull: ['$loanAmount', 0] }, 0] } },
              },
            },
          ]),
        ]);

        const bankBalance = bankTotal[0]?.total || 0;
        const cardBalance = cardTotal[0]?.total || 0;
        const investmentValue = investmentTotal[0]?.total || 0;
        const assetValue = assetTotal[0]?.total || 0;
        const vehicleValue = vehicleTotal[0]?.value || 0;
        const vehicleLoans = vehicleTotal[0]?.loans || 0;

        const totalAssets = bankBalance + investmentValue + assetValue + vehicleValue;
        const totalLiabilities = cardBalance + vehicleLoans;
        const netWorth = totalAssets - totalLiabilities;

        await NetWorthSnapshot.findOneAndUpdate(
          { userId: userObjectId, date: today },
          {
            userId: userObjectId,
            date: today,
            netWorth,
            totalAssets,
            totalLiabilities,
            breakdown: {
              bankAccounts: bankBalance,
              cards: -cardBalance,
              investments: investmentValue,
              assets: assetValue,
              vehicles: vehicleValue,
              vehicleLoans: -vehicleLoans,
              cash: 0,
            },
          },
          { upsert: true }
        );

        snapshotCount++;
      } catch (err) {
        errors.push({ userId: user._id.toString(), error: String(err) });
      }
    }

    console.log(`[CRON] Net worth snapshots: ${snapshotCount} saved, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      snapshotCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[CRON] Net worth snapshot failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
