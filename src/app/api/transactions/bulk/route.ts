import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import { createTransaction } from '@/services/transactionService';
import { TransactionType, AccountType } from '@/types';
import { z } from 'zod';

const bulkTransactionSchema = z.object({
  transactions: z.array(z.object({
    type: z.nativeEnum(TransactionType),
    amount: z.number().positive(),
    dateTime: z.string().or(z.date()),
    note: z.string().optional(),
    categoryId: z.string().optional(),
    memberId: z.string().optional(),
    tripId: z.string().optional(),
    sourceType: z.nativeEnum(AccountType).optional(),
    sourceBankId: z.string().optional(),
    sourceCardId: z.string().optional(),
    destinationType: z.nativeEnum(AccountType).optional(),
    destinationBankId: z.string().optional(),
    destinationCardId: z.string().optional(),
    destinationInvestmentId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { transactions } = bulkTransactionSchema.parse(body);

    await connectToDatabase();

    const results = {
      success: [] as string[],
      failed: [] as { index: number; error: string }[],
    };

    // Process transactions sequentially to maintain balance consistency
    for (let i = 0; i < transactions.length; i++) {
      try {
        const txn = transactions[i];
        
        const created = await createTransaction({
          userId: session.user.id,
          type: txn.type,
          amount: txn.amount,
          dateTime: new Date(txn.dateTime),
          note: txn.note,
          categoryId: txn.categoryId,
          memberId: txn.memberId,
          tripId: txn.tripId,
          sourceType: txn.sourceType,
          sourceBankId: txn.sourceBankId,
          sourceCardId: txn.sourceCardId,
          destinationType: txn.destinationType,
          destinationBankId: txn.destinationBankId,
          destinationCardId: txn.destinationCardId,
          destinationInvestmentId: txn.destinationInvestmentId,
        });

        results.success.push(created._id.toString());
      } catch (error) {
        results.failed.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: results.success.length,
        failed: results.failed.length,
        results,
      },
      message: `Created ${results.success.length} transactions, ${results.failed.length} failed`,
    });
  } catch (error) {
    console.error('Error creating bulk transactions:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create transactions' },
      { status: 500 }
    );
  }
}
