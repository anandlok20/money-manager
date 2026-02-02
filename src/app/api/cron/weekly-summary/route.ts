import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Investment from '@/lib/mongodb/models/Investment';
import Transaction from '@/lib/mongodb/models/Transaction';
import { sendWhatsAppMessage, buildNetWorthSummary } from '@/services/whatsappService';
import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * CRON Job: Send weekly net worth summary to all users with WhatsApp notifications enabled
 * This should run every Sunday at 10 AM IST
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

    // Check if today is Sunday
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const dayOfWeek = istTime.getUTCDay();

    // Only run on Sunday (0) - skip otherwise
    if (dayOfWeek !== 0) {
      return NextResponse.json({
        success: true,
        message: 'Not Sunday, skipping weekly summary',
        skipped: true,
      });
    }

    // Find users who have weekly summary enabled
    const users = await User.find({
      'whatsappNotifications.enabled': true,
      'whatsappNotifications.weeklyNetWorthSummary': true,
      'whatsappNotifications.phoneNumber': { $exists: true, $ne: null },
      'whatsappNotifications.verifiedAt': { $exists: true },
    }).select('_id name currency whatsappNotifications');

    console.log(`Found ${users.length} users to send weekly net worth summary`);

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
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());

        // Get bank balances
        const bankAccounts = await BankAccount.find({ userId, isActive: true });
        const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

        // Get investments
        const investments = await Investment.find({ userId, isActive: true });
        const totalInvestments = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);

        // Get monthly income/expense
        const incomeAgg = await Transaction.aggregate([
          {
            $match: {
              userId,
              type: 'INCOME',
              dateTime: { $gte: monthStart, $lte: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const expenseAgg = await Transaction.aggregate([
          {
            $match: {
              userId,
              type: 'EXPENSE',
              dateTime: { $gte: monthStart, $lte: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const monthlyIncome = incomeAgg[0]?.total || 0;
        const monthlyExpense = expenseAgg[0]?.total || 0;

        // Calculate net worth
        const netWorth = totalBankBalance + totalInvestments;

        // Build and send message
        const message = buildNetWorthSummary({
          netWorth,
          totalBankBalance,
          totalInvestments,
          totalLiabilities: 0,
          monthlyIncome,
          monthlyExpense,
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
      message: `Weekly summary sent to ${results.success}/${results.total} users`,
      results,
    });
  } catch (error) {
    console.error('Error in weekly summary cron:', error);
    return NextResponse.json(
      { error: 'Failed to run weekly summary cron' },
      { status: 500 }
    );
  }
}
