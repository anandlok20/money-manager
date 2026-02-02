import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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

    const userId = session.user.id;

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

    // Calculate current month spending for each card
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const overSpendingCards = [];

    for (const card of cards) {
      // Get expenses for this card in current month
      const expenses = await Transaction.aggregate([
        {
          $match: {
            userId: { $eq: userId },
            sourceCardId: { $eq: card._id },
            type: 'EXPENSE',
            dateTime: {
              $gte: startOfMonth,
              $lt: endOfMonth,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const currentSpending = expenses[0]?.total || 0;

      if (currentSpending > (card.spendingLimit || 0)) {
        overSpendingCards.push({
          _id: card._id,
          cardName: card.cardName,
          displayName: card.cardName,
          currentSpending,
          spendingLimit: card.spendingLimit,
          spendingLimitAlert: card.spendingLimitAlert,
        });
      }
    }

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
