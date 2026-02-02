import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import Transaction from '@/lib/mongodb/models/Transaction';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import { sendWhatsAppMessage, buildAlertMessage, formatCurrencyForMessage } from '@/services/whatsappService';
import { addDays, startOfMonth, endOfMonth } from 'date-fns';

/**
 * CRON Job: Check for alerts and send WhatsApp notifications
 * This should run every hour to check for various alerts
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

    const results = {
      lowBalanceAlerts: 0,
      spendingLimitAlerts: 0,
      dueDateAlerts: 0,
      errors: [] as string[],
    };

    // 1. Low Balance Alerts
    const usersWithLowBalanceAlert = await User.find({
      'whatsappNotifications.enabled': true,
      'whatsappNotifications.lowBalanceAlerts': true,
      'whatsappNotifications.phoneNumber': { $exists: true, $ne: null },
      'whatsappNotifications.verifiedAt': { $exists: true },
    }).select('_id currency whatsappNotifications');

    for (const user of usersWithLowBalanceAlert) {
      try {
        const lowBalanceAccounts = await BankAccount.find({
          userId: user._id,
          isActive: true,
          minimumBalanceAlert: true,
          minimumBalance: { $gt: 0 },
          $expr: { $lt: ['$currentBalance', '$minimumBalance'] },
        });

        const phoneNumber = user.whatsappNotifications?.phoneNumber;
        if (!phoneNumber) continue;

        for (const account of lowBalanceAccounts) {
          const message = buildAlertMessage('low_balance', {
            accountName: account.bankName,
            currentBalance: formatCurrencyForMessage(account.currentBalance, user.currency || 'INR'),
            minimumBalance: formatCurrencyForMessage(account.minimumBalance || 0, user.currency || 'INR'),
          });

          const result = await sendWhatsAppMessage({
            to: phoneNumber,
            message,
          });

          if (result.success) {
            results.lowBalanceAlerts++;
          } else {
            results.errors.push(`Low balance alert failed for user ${user._id}: ${result.error}`);
          }
        }
      } catch (error) {
        results.errors.push(`Low balance check failed for user ${user._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Spending Limit Alerts
    const usersWithSpendingAlert = await User.find({
      'whatsappNotifications.enabled': true,
      'whatsappNotifications.spendingLimitAlerts': true,
      'whatsappNotifications.phoneNumber': { $exists: true, $ne: null },
      'whatsappNotifications.verifiedAt': { $exists: true },
    }).select('_id currency whatsappNotifications');

    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    for (const user of usersWithSpendingAlert) {
      const spendingPhoneNumber = user.whatsappNotifications?.phoneNumber;
      if (!spendingPhoneNumber) continue;

      try {
        const cards = await Card.find({
          userId: user._id,
          isActive: true,
          spendingLimitAlert: true,
          spendingLimit: { $gt: 0 },
        });

        for (const card of cards) {
          // Get monthly spending for this card
          const spending = await Transaction.aggregate([
            {
              $match: {
                userId: user._id,
                sourceCardId: card._id,
                type: 'EXPENSE',
                dateTime: { $gte: monthStart, $lte: monthEnd },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]);

          const currentSpending = spending[0]?.total || 0;
          const spendingLimit = card.spendingLimit || 0;

          if (spendingLimit > 0 && currentSpending > spendingLimit) {
            const overAmount = currentSpending - spendingLimit;
            const message = buildAlertMessage('spending_limit', {
              cardName: card.cardName,
              spendingLimit: formatCurrencyForMessage(spendingLimit, user.currency || 'INR'),
              currentSpending: formatCurrencyForMessage(currentSpending, user.currency || 'INR'),
              overAmount: formatCurrencyForMessage(overAmount, user.currency || 'INR'),
            });

            const result = await sendWhatsAppMessage({
              to: spendingPhoneNumber,
              message,
            });

            if (result.success) {
              results.spendingLimitAlerts++;
            } else {
              results.errors.push(`Spending limit alert failed for user ${user._id}: ${result.error}`);
            }
          }
        }
      } catch (error) {
        results.errors.push(`Spending check failed for user ${user._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 3. Due Date Alerts (for scheduled payments due tomorrow)
    const usersWithDueAlerts = await User.find({
      'whatsappNotifications.enabled': true,
      'whatsappNotifications.dueDateAlerts': true,
      'whatsappNotifications.phoneNumber': { $exists: true, $ne: null },
      'whatsappNotifications.verifiedAt': { $exists: true },
    }).select('_id currency whatsappNotifications');

    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = addDays(tomorrow, 1);

    for (const user of usersWithDueAlerts) {
      const duePhoneNumber = user.whatsappNotifications?.phoneNumber;
      if (!duePhoneNumber) continue;

      try {
        const upcomingPayments = await ScheduledPayment.find({
          userId: user._id,
          isActive: true,
          nextRunDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
        });

        for (const payment of upcomingPayments) {
          const message = buildAlertMessage('due_date', {
            name: payment.note || 'Scheduled Payment',
            amount: formatCurrencyForMessage(payment.amount, user.currency || 'INR'),
            dueDate: 'Tomorrow',
          });

          const result = await sendWhatsAppMessage({
            to: duePhoneNumber,
            message,
          });

          if (result.success) {
            results.dueDateAlerts++;
          } else {
            results.errors.push(`Due date alert failed for user ${user._id}: ${result.error}`);
          }
        }
      } catch (error) {
        results.errors.push(`Due date check failed for user ${user._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Alert check completed',
      results,
    });
  } catch (error) {
    console.error('Error in alerts cron:', error);
    return NextResponse.json(
      { error: 'Failed to run alerts cron' },
      { status: 500 }
    );
  }
}
