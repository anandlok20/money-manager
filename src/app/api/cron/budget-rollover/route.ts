import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb/client';
import Budget from '@/lib/mongodb/models/Budget';
import Transaction from '@/lib/mongodb/models/Transaction';
import { TransactionType } from '@/types';

// Called on 1st of each month by cron: copies prior month budgets to current month,
// carrying over unspent amounts for budgets with rolloverEnabled = true.
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

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Prior month
    const priorMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const priorYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Get all active budgets from the prior month
    const priorBudgets = await Budget.find({
      month: priorMonth,
      year: priorYear,
      isActive: true,
    }).lean();

    let createdCount = 0;
    let skippedCount = 0;
    const errors: { budgetId: string; error: string }[] = [];

    for (const budget of priorBudgets) {
      try {
        // Skip if a budget already exists for this user+category in the current month
        const alreadyExists = await Budget.exists({
          userId: budget.userId,
          categoryId: budget.categoryId,
          month: currentMonth,
          year: currentYear,
        });

        if (alreadyExists) {
          skippedCount++;
          continue;
        }

        let rolloverAmount = 0;

        if (budget.rolloverEnabled) {
          // Calculate spent amount for the prior month
          const priorMonthStart = new Date(priorYear, priorMonth - 1, 1);
          const priorMonthEnd = new Date(priorYear, priorMonth, 0, 23, 59, 59, 999);

          const spentResult = await Transaction.aggregate([
            {
              $match: {
                userId: { $eq: new mongoose.Types.ObjectId(budget.userId.toString()) },
                categoryId: { $eq: new mongoose.Types.ObjectId(budget.categoryId.toString()) },
                type: TransactionType.EXPENSE,
                dateTime: { $gte: priorMonthStart, $lte: priorMonthEnd },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]);

          const spent = spentResult[0]?.total || 0;
          const totalAvailable = budget.amount + (budget.rolloverAmount || 0);
          rolloverAmount = Math.max(0, totalAvailable - spent);
        }

        await Budget.create({
          userId: budget.userId,
          categoryId: budget.categoryId,
          amount: budget.amount,
          month: currentMonth,
          year: currentYear,
          rolloverEnabled: budget.rolloverEnabled,
          rolloverAmount,
          isActive: true,
        });

        createdCount++;
      } catch (err) {
        errors.push({ budgetId: budget._id.toString(), error: String(err) });
      }
    }

    console.log(`[CRON] Budget rollover: ${createdCount} created, ${skippedCount} skipped, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[CRON] Budget rollover failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
