import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb/client';
import ScheduledPayment from '@/lib/mongodb/models/ScheduledPayment';
import { createTransaction } from '@/services/transactionService';
import { calculateNextRunDate } from '@/services/scheduledPaymentService';
import { TransactionType, AccountType } from '@/types';

// Maximum payments to process in a single CRON run (catch-up storm protection)
const MAX_PAYMENTS_PER_RUN = 50;

// This endpoint is called by a CRON job to process scheduled payments
export async function POST(request: NextRequest) {
  try {
    // Verify CRON secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Always return 401 for missing/invalid auth — never leak misconfiguration details
    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET environment variable is not set');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const expected = `Bearer ${cronSecret}`;
    const provided = authHeader ?? '';
    // Constant-time comparison to prevent timing attacks
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
    let processedCount = 0;
    const errors: { paymentId: string; error: string }[] = [];

    // Process payments one at a time using atomic claim pattern
    // This prevents duplicate processing across concurrent CRON invocations
    while (processedCount < MAX_PAYMENTS_PER_RUN) {
      // Atomically claim a payment by updating its nextRunDate before processing
      const payment = await ScheduledPayment.findOneAndUpdate(
        {
          isActive: true,
          nextRunDate: { $lte: now },
        },
        {
          $set: {
            // Temporarily set to far future to prevent double-processing
            nextRunDate: new Date('2099-01-01'),
          },
        },
        {
          returnDocument: 'before', // Get the original document
          sort: { nextRunDate: 1 },  // Process oldest first
        }
      );

      if (!payment) break; // No more due payments

      try {
        // Determine transaction type based on destination
        const transactionType = payment.destinationType === AccountType.INVESTMENT
          ? TransactionType.INVESTMENT_CONTRIBUTION
          : TransactionType.TRANSFER_SELF;

        // Create the transaction (atomically updates balances)
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

        // Calculate next run date from the ORIGINAL nextRunDate (not now)
        // This prevents schedule drift
        let nextRunDate = calculateNextRunDate(payment.nextRunDate, payment.frequency);

        // If nextRunDate is still in the past (missed multiple runs), advance to future
        while (nextRunDate <= now) {
          nextRunDate = calculateNextRunDate(nextRunDate, payment.frequency);
        }

        // Update with correct next run date and last run timestamp
        await ScheduledPayment.findByIdAndUpdate(payment._id, {
          $set: {
            lastRunDate: now,
            nextRunDate: nextRunDate,
          },
        });

        processedCount++;
      } catch (error) {
        console.error(`Error processing scheduled payment ${payment._id}:`, error);
        
        // Restore the original nextRunDate so it can be retried
        await ScheduledPayment.findByIdAndUpdate(payment._id, {
          $set: {
            nextRunDate: payment.nextRunDate,
          },
        });

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

// Vercel Cron requires GET — delegate to POST
export async function GET(request: NextRequest) {
  return POST(request);
}
