import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import { createTransaction } from '@/services/transactionService';
import { calculateNextRunDate } from '@/services/scheduledPaymentService';
import { TransactionType, AccountType } from '@/types';

// This endpoint is called by a CRON job to process scheduled payments
export async function POST(request: NextRequest) {
  try {
    // Verify CRON secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const now = new Date();

    // Find all due payments
    const duePayments = await ScheduledPayment.find({
      isActive: true,
      nextRunDate: { $lte: now },
    }).lean();

    let processedCount = 0;
    const errors: { paymentId: string; error: string }[] = [];

    for (const payment of duePayments) {
      try {
        // Determine transaction type based on destination
        const transactionType = payment.destinationType === AccountType.INVESTMENT
          ? TransactionType.INVESTMENT_CONTRIBUTION
          : TransactionType.TRANSFER_SELF;

        // Create the transaction
        await createTransaction({
          userId: payment.userId.toString(),
          type: transactionType,
          amount: payment.amount,
          dateTime: now,
          note: payment.note || 'Scheduled payment',
          memberId: payment.memberId?.toString(),
          sourceType: payment.sourceType,
          sourceBankId: payment.sourceBankId?.toString(),
          sourceCardId: payment.sourceCardId?.toString(),
          destinationType: payment.destinationType,
          destinationBankId: payment.destinationBankId?.toString(),
          destinationCardId: payment.destinationCardId?.toString(),
          destinationInvestmentId: payment.destinationInvestmentId?.toString(),
        });

        // Calculate next run date
        const nextRunDate = calculateNextRunDate(payment.nextRunDate, payment.frequency);

        // Update the scheduled payment
        await ScheduledPayment.findByIdAndUpdate(payment._id, {
          $set: {
            lastRunDate: now,
            nextRunDate: nextRunDate,
          },
        });

        processedCount++;
      } catch (error) {
        console.error(`Error processing scheduled payment ${payment._id}:`, error);
        errors.push({
          paymentId: payment._id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} scheduled payments`,
      processedCount,
      totalDue: duePayments.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error processing scheduled payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process scheduled payments' },
      { status: 500 }
    );
  }
}

// Also allow GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
