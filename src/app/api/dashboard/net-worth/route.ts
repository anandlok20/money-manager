import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import Investment from '@/lib/mongodb/models/Investment';
import Asset from '@/lib/mongodb/models/Asset';
import Vehicle from '@/lib/mongodb/models/Vehicle';
import Loan from '@/lib/mongodb/models/Loan';
import { NetWorthSnapshot } from '@/lib/mongodb/models';
import { startOfDay, subMonths, format, eachMonthOfInterval, startOfMonth } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const months = parseInt(searchParams.get('months') || '12', 10);

    await connectToDatabase();

    const userId = session.user.id;

    // Get current net worth
    const currentNetWorth = await calculateCurrentNetWorth(userId);

    // Optionally include history
    let history = null;
    let growth = null;
    if (includeHistory) {
      const startDate = subMonths(new Date(), months);

      const snapshots = await NetWorthSnapshot.find({
        userId,
        date: { $gte: startDate },
      })
        .sort({ date: 1 })
        .lean();

      // Generate all months in the range
      const allMonths = eachMonthOfInterval({
        start: startOfMonth(startDate),
        end: startOfMonth(new Date()),
      });

      // Fill in missing months
      history = allMonths.map((monthDate) => {
        const monthKey = format(monthDate, 'yyyy-MM');
        const snapshot = snapshots.find(
          (s) => format(new Date(s.date), 'yyyy-MM') === monthKey
        );

        if (snapshot) {
          return {
            date: snapshot.date,
            month: format(new Date(snapshot.date), 'MMM yyyy'),
            netWorth: snapshot.netWorth,
            totalAssets: snapshot.totalAssets,
            totalLiabilities: snapshot.totalLiabilities,
            breakdown: snapshot.breakdown,
          };
        }

        return {
          date: monthDate,
          month: format(monthDate, 'MMM yyyy'),
          netWorth: null,
          totalAssets: null,
          totalLiabilities: null,
          breakdown: null,
        };
      });

      // Calculate growth
      const firstValidSnapshot = history.find((h) => h.netWorth !== null);
      if (firstValidSnapshot && firstValidSnapshot.netWorth !== null) {
        growth = {
          absolute: currentNetWorth.netWorth - firstValidSnapshot.netWorth,
          percentage:
            firstValidSnapshot.netWorth !== 0
              ? ((currentNetWorth.netWorth - firstValidSnapshot.netWorth) /
                  Math.abs(firstValidSnapshot.netWorth)) *
                100
              : 0,
          periodMonths: months,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        netWorth: currentNetWorth.netWorth,
        totalAssets: currentNetWorth.totalAssets,
        totalLiabilities: currentNetWorth.totalLiabilities,
        breakdown: currentNetWorth.breakdown,
        history,
        growth,
      },
    });
  } catch (error) {
    console.error('Error fetching net worth:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch net worth' },
      { status: 500 }
    );
  }
}

// POST - Create/update net worth snapshot
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const userId = session.user.id;
    const today = startOfDay(new Date());

    const currentNetWorth = await calculateCurrentNetWorth(userId);

    // Upsert snapshot for today
    const snapshot = await NetWorthSnapshot.findOneAndUpdate(
      { userId, date: today },
      {
        userId,
        date: today,
        ...currentNetWorth,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Snapshot saved',
      data: snapshot,
    });
  } catch (error) {
    console.error('Error saving net worth snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save snapshot' },
      { status: 500 }
    );
  }
}

async function calculateCurrentNetWorth(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [bankTotal, cardTotal, investmentTotal, assetTotal, vehicleTotal, loanTotal] = await Promise.all([
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
    Loan.aggregate([
      { $match: { userId: { $eq: userObjectId }, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$outstandingBalance' } } },
    ]),
  ]);

  const bankBalance = bankTotal[0]?.total || 0;
  const cardBalance = cardTotal[0]?.total || 0; // Positive = debt owed
  const investmentValue = investmentTotal[0]?.total || 0;
  const assetValue = assetTotal[0]?.total || 0;
  const vehicleValue = vehicleTotal[0]?.value || 0;
  const vehicleLoans = vehicleTotal[0]?.loans || 0;
  const loanBalance = loanTotal[0]?.total || 0;

  const totalAssets = bankBalance + investmentValue + assetValue + vehicleValue;
  const totalLiabilities = cardBalance + vehicleLoans + loanBalance;
  const netWorth = totalAssets - totalLiabilities;

  return {
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
      loans: -loanBalance,
      cash: 0,
    },
  };
}
