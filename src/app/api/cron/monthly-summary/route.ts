import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import Transaction from '@/lib/mongodb/models/Transaction';
import { sendWhatsAppMessage, buildMonthlySummary } from '@/services/whatsappService';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

/**
 * CRON Job: Send monthly summary to all users with WhatsApp notifications enabled
 * This should run on the 1st of every month at 10 AM IST
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

    // Check if today is 1st of month
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const dayOfMonth = istTime.getUTCDate();

    // Only run on 1st - skip otherwise
    if (dayOfMonth !== 1) {
      return NextResponse.json({
        success: true,
        message: 'Not 1st of month, skipping monthly summary',
        skipped: true,
      });
    }

    // Find users who have monthly summary enabled
    const users = await User.find({
      'whatsappNotifications.enabled': true,
      'whatsappNotifications.monthlySummary': true,
      'whatsappNotifications.phoneNumber': { $exists: true, $ne: null },
      'whatsappNotifications.verifiedAt': { $exists: true },
    }).select('_id name currency whatsappNotifications');

    console.log(`Found ${users.length} users to send monthly summary`);

    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get previous month's data
    const lastMonth = subMonths(new Date(), 1);
    const monthStart = startOfMonth(lastMonth);
    const monthEnd = endOfMonth(lastMonth);
    const monthName = format(lastMonth, 'MMMM');
    const year = lastMonth.getFullYear();

    for (const user of users) {
      const phoneNumber = user.whatsappNotifications?.phoneNumber;
      if (!phoneNumber) continue;

      try {
        const userId = user._id;

        // Get transactions with categories
        const transactions = await Transaction.aggregate([
          {
            $match: {
              userId,
              dateTime: { $gte: monthStart, $lte: monthEnd },
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
        let totalIncome = 0;
        let totalExpense = 0;
        const categoryTotals: Record<string, number> = {};

        for (const tx of transactions) {
          if (tx.type === 'INCOME') {
            totalIncome += tx.amount;
          } else if (tx.type === 'EXPENSE') {
            totalExpense += tx.amount;
            const catName = tx.category?.name || 'Uncategorized';
            categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount;
          }
        }

        const savings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

        // Build category breakdown with percentages
        const categoryBreakdown = Object.entries(categoryTotals)
          .map(([name, amount]) => ({
            name,
            amount,
            percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        // Build and send message
        const message = buildMonthlySummary({
          month: monthName,
          year,
          totalIncome,
          totalExpense,
          savings,
          savingsRate,
          categoryBreakdown,
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
      message: `Monthly summary sent to ${results.success}/${results.total} users`,
      results,
    });
  } catch (error) {
    console.error('Error in monthly summary cron:', error);
    return NextResponse.json(
      { error: 'Failed to run monthly summary cron' },
      { status: 500 }
    );
  }
}
