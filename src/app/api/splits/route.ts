import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import SplitExpense, { SplitStatus } from '@/lib/mongodb/models/SplitExpense';
import Transaction from '@/lib/mongodb/models/Transaction';
import { createSplitSchema } from '@/lib/validations/split';
import { buildPrivacyFilter } from '@/lib/utils/privacy';
import { TransactionType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { userId: session.user.id };
    if (status === 'pending') {
      query['splits.status'] = SplitStatus.PENDING;
    } else if (status === 'settled') {
      // All items settled: no PENDING items remain
      query['splits.status'] = { $not: { $eq: SplitStatus.PENDING } };
    }
    Object.assign(query, buildPrivacyFilter(session.user));

    const splits = await SplitExpense.find(query)
      .populate('transactionId', 'note dateTime amount categoryId sourceBankId sourceCardId')
      .populate('splits.memberId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: splits.map((s) => ({ ...s, _id: s._id.toString() })),
    });
  } catch (error) {
    console.error('Error fetching splits:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch splits' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSplitSchema.parse(body);

    await connectToDatabase();

    // Verify transaction exists, belongs to user, and is an EXPENSE
    const transaction = await Transaction.findOne({
      _id: validatedData.transactionId,
      userId: session.user.id,
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.type !== TransactionType.EXPENSE) {
      return NextResponse.json(
        { success: false, error: 'Only expense transactions can be split' },
        { status: 400 }
      );
    }

    // Check no existing split for this transaction
    const existing = await SplitExpense.findOne({ transactionId: validatedData.transactionId });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'This transaction already has a split' },
        { status: 409 }
      );
    }

    const splitsTotal = validatedData.splits.reduce((sum, s) => sum + s.amount, 0);
    const yourShare = transaction.amount - splitsTotal;

    if (yourShare < -0.01) {
      return NextResponse.json(
        { success: false, error: 'Split amounts exceed the total transaction amount' },
        { status: 400 }
      );
    }

    const splitExpense = await SplitExpense.create({
      userId: session.user.id,
      transactionId: validatedData.transactionId,
      totalAmount: transaction.amount,
      yourShare: Math.max(0, yourShare),
      splits: validatedData.splits.map((s) => ({
        name: s.name,
        memberId: s.memberId || undefined,
        amount: s.amount,
        status: SplitStatus.PENDING,
      })),
      isPrivate: validatedData.isPrivate,
      privateMemberId: validatedData.isPrivate ? session.user.memberId || undefined : undefined,
    });

    return NextResponse.json({ success: true, data: splitExpense }, { status: 201 });
  } catch (error) {
    console.error('Error creating split:', error);
    return NextResponse.json({ success: false, error: 'Failed to create split' }, { status: 500 });
  }
}
