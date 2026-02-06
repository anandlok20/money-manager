import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import Transaction from '@/lib/mongodb/models/Transaction';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Get all bank accounts with minimumBalanceAlert enabled
    const bankAccounts = await BankAccount.find({
      userId,
      minimumBalanceAlert: true,
      minimumBalance: { $gt: 0 },
    }).select('bankName accountHolderName currentBalance minimumBalance minimumBalanceAlert');

    // Filter accounts where current balance is below minimum
    const lowBalanceAccounts = bankAccounts.filter(
      (account) => account.currentBalance < (account.minimumBalance || 0)
    );

    // Get all cards with spendingLimitAlert enabled
    const cards = await Card.find({
      userId,
      spendingLimitAlert: true,
      spendingLimit: { $gt: 0 },
    }).select('cardName cardType spendingLimit spendingLimitAlert');

    // Calculate current month spending for ALL cards in a single aggregation (fix N+1)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const cardIds = cards.map((c) => c._id);

    // Single aggregation query grouped by sourceCardId instead of N queries
    const spendingByCard = await Transaction.aggregate([
      {
        $match: {
          userId: { $eq: userId },
          sourceCardId: { $in: cardIds },
          type: 'EXPENSE',
          dateTime: {
            $gte: startOfMonth,
            $lt: endOfMonth,
          },
        },
      },
      {
        $group: {
          _id: '$sourceCardId',
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Create O(1) lookup map
    const spendingMap = new Map(
      spendingByCard.map((s) => [s._id?.toString(), s.total])
    );

    const overSpendingCards = cards
      .map((card) => {
        const currentSpending = spendingMap.get(card._id.toString()) || 0;
        if (currentSpending > (card.spendingLimit || 0)) {
          return {
            _id: card._id,
            cardName: card.cardName,
            displayName: card.cardName,
            currentSpending,
            spendingLimit: card.spendingLimit,
            spendingLimitAlert: card.spendingLimitAlert,
          };
        }
        return null;
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        lowBalanceAccounts: lowBalanceAccounts.map((account) => ({
          _id: account._id,
          bankName: account.bankName,
          displayName: `${account.bankName} - ${account.accountHolderName}`,
          currentBalance: account.currentBalance,
          minimumBalance: account.minimumBalance,
          minimumBalanceAlert: account.minimumBalanceAlert,
        })),
        overSpendingCards,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
