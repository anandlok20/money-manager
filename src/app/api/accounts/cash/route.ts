import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Transaction from '@/lib/mongodb/models/Transaction';
import Category from '@/lib/mongodb/models/Category';
import SplitExpense, { SplitStatus } from '@/lib/mongodb/models/SplitExpense';
import Member from '@/lib/mongodb/models/Member';
import { createTransaction } from '@/services/transactionService';
import { TransactionType, AccountType, CategoryType } from '@/types';

const addCashSchema = z.object({
  type: z.enum(['in', 'out']),
  amount: z.number().positive('Amount must be positive'),
  memberId: z.string().optional(),
  cashPersonName: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  isSplit: z.boolean().default(false),
  splitPercent: z.number().min(1).max(100).default(100),
});

/** Find or create a fallback category for cash entries */
async function getOrCreateCashCategory(
  userId: string,
  type: 'in' | 'out'
): Promise<string | undefined> {
  const catType = type === 'in' ? CategoryType.INCOME : CategoryType.EXPENSE;
  const catName = type === 'in' ? 'Cash Received' : 'Cash Given';

  // Try to find existing category
  let cat = await Category.findOne({ userId, name: catName, type: catType }).lean();
  if (cat) return cat._id.toString();

  // Fall back to "Other Income" / "Other Expense"
  const fallbackName = type === 'in' ? 'Other Income' : 'Other Expense';
  cat = await Category.findOne({ userId, name: fallbackName, type: catType }).lean();
  if (cat) return cat._id.toString();

  // Create a new "Cash Received" / "Cash Given" category
  const newCat = await Category.create({
    userId,
    name: catName,
    type: catType,
    icon: 'Banknote',
    color: type === 'in' ? '#22c55e' : '#f97316',
    isActive: true,
  });
  return newCat._id.toString();
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Parse optional month/year filters (default to current month)
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10); // 1-12

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const userId = session.user.id;
    const userObjId = new mongoose.Types.ObjectId(userId);

    // ── MEMBER VIEW ──────────────────────────────────────────────────────────
    // When a member is logged in, show cash that the primary user gave to/received from them.
    // Primary's EXPENSE (tagged to member) = cash member received = member's cash IN
    // Primary's INCOME  (tagged to member) = cash member returned = member's cash OUT
    if (session.user.isMemberUser && session.user.memberId) {
      const memberObjId = new mongoose.Types.ObjectId(session.user.memberId);
      const memberBase = { userId: userObjId, sourceType: AccountType.CASH, memberId: memberObjId };

      const [allStats, monthlyStats, monthTransactions] = await Promise.all([
        Transaction.aggregate([
          { $match: memberBase },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { ...memberBase, dateTime: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]),
        Transaction.find({ ...memberBase, dateTime: { $gte: monthStart, $lte: monthEnd } })
          .sort({ dateTime: -1 })
          .limit(100)
          .populate('memberId', 'name')
          .lean(),
      ]);

      // For the member: EXPENSE = received from primary, INCOME = returned to primary
      let totalReceived = 0, totalReturned = 0, monthReceived = 0, monthReturned = 0;
      for (const s of allStats) {
        if (s._id === TransactionType.EXPENSE) totalReceived = s.total;
        if (s._id === TransactionType.INCOME) totalReturned = s.total;
      }
      for (const s of monthlyStats) {
        if (s._id === TransactionType.EXPENSE) monthReceived = s.total;
        if (s._id === TransactionType.INCOME) monthReturned = s.total;
      }

      const txIds = monthTransactions.map((t) => t._id);
      const splits = await SplitExpense.find({ transactionId: { $in: txIds } })
        .select('transactionId direction splits').lean();
      const splitByTxId = new Map(splits.map((s) => [s.transactionId.toString(), s]));

      return NextResponse.json({
        success: true,
        data: {
          isMemberView: true,
          // balance = net cash member is holding (received - returned)
          balance: totalReceived - totalReturned,
          totalIn: totalReceived,
          totalOut: totalReturned,
          monthlyIn: monthReceived,
          monthlyOut: monthReturned,
          transactions: monthTransactions.map((tx) => ({
            ...tx,
            _id: tx._id.toString(),
            // Flip display: primary's EXPENSE = member received (+), INCOME = member returned (-)
            displayType: tx.type === TransactionType.EXPENSE ? 'INCOME' : 'EXPENSE',
            split: splitByTxId.get(tx._id.toString()) ?? null,
          })),
          selectedYear: year,
          selectedMonth: month,
        },
      });
    }

    // ── PRIMARY USER VIEW ─────────────────────────────────────────────────────
    const [monthlyStats, monthTransactions, allTransactions] = await Promise.all([
      // Stats for selected month
      Transaction.aggregate([
        {
          $match: {
            userId: userObjId,
            sourceType: AccountType.CASH,
            dateTime: { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      // Transactions for selected month
      Transaction.find({
        userId,
        sourceType: AccountType.CASH,
        dateTime: { $gte: monthStart, $lte: monthEnd },
      })
        .sort({ dateTime: -1 })
        .limit(100)
        .populate('memberId', 'name')
        .populate('categoryId', 'name icon color')
        .lean(),
      // All cash transactions for running total
      Transaction.aggregate([
        { $match: { userId: userObjId, sourceType: AccountType.CASH } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
    ]);

    // Compute monthly in/out
    let monthlyIn = 0;
    let monthlyOut = 0;
    for (const stat of monthlyStats) {
      if (stat._id === TransactionType.INCOME) monthlyIn = stat.total;
      if (stat._id === TransactionType.EXPENSE) monthlyOut = stat.total;
    }

    // Total cash = all-time income - all-time expense (computed from transactions, always accurate)
    let totalIn = 0;
    let totalOut = 0;
    for (const stat of allTransactions) {
      if (stat._id === TransactionType.INCOME) totalIn = stat.total;
      if (stat._id === TransactionType.EXPENSE) totalOut = stat.total;
    }

    // Fetch splits
    const txIds = monthTransactions.map((t) => t._id);
    const splits = await SplitExpense.find({ transactionId: { $in: txIds } })
      .select('transactionId direction splits')
      .lean();
    const splitByTxId = new Map(splits.map((s) => [s.transactionId.toString(), s]));

    const enrichedTransactions = monthTransactions.map((tx) => ({
      ...tx,
      _id: tx._id.toString(),
      split: splitByTxId.get(tx._id.toString()) ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        isMemberView: false,
        // Balance computed from transactions (always accurate, no drift from stored value)
        balance: totalIn - totalOut,
        totalIn,
        totalOut,
        monthlyIn,
        monthlyOut,
        transactions: enrichedTransactions,
        selectedYear: year,
        selectedMonth: month,
      },
    });
  } catch (error) {
    console.error('Error fetching cash account:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch cash account' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = addCashSchema.parse(body);

    await connectToDatabase();

    // Resolve category
    const categoryId = data.categoryId || (await getOrCreateCashCategory(session.user.id, data.type));
    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'No category available' }, { status: 400 });
    }

    // Resolve person name
    let personName = data.cashPersonName;
    if (data.memberId && !personName) {
      const member = await Member.findOne({ _id: data.memberId, userId: session.user.id }).lean();
      if (member) personName = member.name;
    }

    const txType = data.type === 'in' ? TransactionType.INCOME : TransactionType.EXPENSE;
    const dateTime = data.date ? new Date(data.date) : new Date();

    const transaction = await createTransaction({
      userId: session.user.id,
      type: txType,
      amount: data.amount,
      dateTime,
      note: data.note,
      categoryId,
      memberId: data.memberId,
      cashPersonName: personName,
      sourceType: AccountType.CASH,
      paymentMode: 'cash',
    });

    // Create split if requested
    let splitExpense = null;
    if (data.isSplit) {
      const splitAmount = Math.round((data.amount * data.splitPercent) / 100 * 100) / 100;
      const direction = data.type === 'out' ? 'owed_to_me' : 'i_owe';

      splitExpense = await SplitExpense.create({
        userId: session.user.id,
        transactionId: transaction._id,
        totalAmount: data.amount,
        yourShare: data.type === 'out' ? data.amount - splitAmount : 0,
        direction,
        splits: [
          {
            name: personName || 'Unknown',
            memberId: data.memberId || undefined,
            amount: splitAmount,
            status: SplitStatus.PENDING,
          },
        ],
      });
    }

    return NextResponse.json({ success: true, data: { transaction, splitExpense } }, { status: 201 });
  } catch (error) {
    console.error('Error adding cash entry:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to add cash entry' }, { status: 500 });
  }
}
