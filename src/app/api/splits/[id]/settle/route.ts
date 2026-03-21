import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import SplitExpense, { SplitStatus } from '@/lib/mongodb/models/SplitExpense';
import Transaction from '@/lib/mongodb/models/Transaction';
import { createTransaction } from '@/services/transactionService';
import { settleSplitSchema } from '@/lib/validations/split';
import { TransactionType, AccountType } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = settleSplitSchema.parse(body);

    await connectToDatabase();

    const splitExpense = await SplitExpense.findOne({ _id: id, userId: session.user.id });
    if (!splitExpense) {
      return NextResponse.json({ success: false, error: 'Split not found' }, { status: 404 });
    }

    // Fetch the original expense transaction for source account details
    const originalTransaction = await Transaction.findById(splitExpense.transactionId);
    if (!originalTransaction) {
      return NextResponse.json(
        { success: false, error: 'Original transaction not found' },
        { status: 404 }
      );
    }

    const createdTransactionIds: string[] = [];

    for (const splitItemId of validatedData.splitItemIds) {
      const item = splitExpense.splits.find((s) => s._id.toString() === splitItemId);

      if (!item) continue;
      if (item.status === SplitStatus.SETTLED) continue; // already settled — skip silently

      // Create an INCOME transaction for the repayment
      const repaymentTx = await createTransaction({
        userId: session.user.id,
        type: TransactionType.INCOME,
        amount: item.amount,
        dateTime: new Date(),
        note: `Split repayment from ${item.name}`,
        memberId: item.memberId?.toString(),
        // Credit to the same account that was debited for the original expense
        sourceType: originalTransaction.sourceType as AccountType | undefined,
        sourceBankId: originalTransaction.sourceBankId?.toString(),
        sourceCardId: originalTransaction.sourceCardId?.toString(),
      });

      item.status = SplitStatus.SETTLED;
      item.settledAt = new Date();
      item.settlementTransactionId = repaymentTx._id;
      createdTransactionIds.push(repaymentTx._id.toString());
    }

    await splitExpense.save();

    return NextResponse.json({
      success: true,
      data: {
        splitExpense,
        createdTransactionIds,
      },
    });
  } catch (error) {
    console.error('Error settling split:', error);
    return NextResponse.json({ success: false, error: 'Failed to settle split' }, { status: 500 });
  }
}
