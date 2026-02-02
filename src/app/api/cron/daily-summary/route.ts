import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import Transaction from '@/lib/mongodb/models/Transaction';
import { sendWhatsAppMessage, buildDailyExpenseSummary } from '@/services/whatsappService';
import { startOfDay, endOfDay, format } from 'date-fns';

/**
 * CRON Job: Send daily expense summary to all users with WhatsApp notifications enabled
 * This should be triggered by Vercel Cron or similar service
 * 
 * Schedule: Every hour to check for users with matching dailySummaryTime
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get current hour in IST (India Standard Time)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const currentHour = istTime.getUTCHours().toString().padStart(2, '0') + ':00';

    console.log(`Running daily summary cron at ${currentHour} IST`);

    // Find users who have daily summary enabled at this hour
    const users = await User.find({
      'whatsappNotifications.enabled': true,
      'whatsappNotifications.dailyExpenseSummary': true,
      'whatsappNotifications.phoneNumber': { $exists: true, $ne: null },
      'whatsappNotifications.verifiedAt': { $exists: true },
      'whatsappNotifications.dailySummaryTime': currentHour,
    }).select('_id name currency whatsappNotifications');

    console.log(`Found ${users.length} users to send daily summary`);

    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const user of users) {
      const phoneNumber = user.whatsappNotifications?.phoneNumber;
      if (!phoneNumber) continue;

      try {
        const userId = user._id;
        const today = new Date();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        // Get today's transactions
        const transactions = await Transaction.aggregate([
          {
            $match: {
              userId,
              dateTime: { $gte: dayStart, $lte: dayEnd },
            },
          },
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'category',
            },
          },
          {
            $unwind: { path: '$category', preserveNullAndEmptyArrays: true },
          },
        ]);

        // Calculate totals
        let totalExpense = 0;
        let totalIncome = 0;
        const categoryTotals: Record<string, number> = {};

        for (const tx of transactions) {
          if (tx.type === 'EXPENSE') {
            totalExpense += tx.amount;
            const catName = tx.category?.name || 'Uncategorized';
            categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount;
          } else if (tx.type === 'INCOME') {
            totalIncome += tx.amount;
          }
        }

        // Sort categories by amount
        const topCategories = Object.entries(categoryTotals)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount);

        // Build and send message
        const message = buildDailyExpenseSummary({
          date: format(today, 'dd MMM yyyy'),
          totalExpense,
          totalIncome,
          transactionCount: transactions.length,
          topCategories,
          currency: user.currency || 'INR',
        });

        const result = await sendWhatsAppMessage({
          to: phoneNumber,
          message,
        });

        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`User ${user._id}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${user._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily summary sent to ${results.success}/${results.total} users`,
      results,
    });
  } catch (error) {
    console.error('Error in daily summary cron:', error);
    return NextResponse.json(
      { error: 'Failed to run daily summary cron' },
      { status: 500 }
    );
  }
}
