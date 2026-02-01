import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import Category from '@/lib/mongodb/models/Category';
import Investment from '@/lib/mongodb/models/Investment';
import Goal from '@/lib/mongodb/models/Goal';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const userId = session.user.id;

    // Check counts in parallel
    const [
      memberCount,
      bankAccountCount,
      cardCount,
      categoryCount,
      investmentCount,
      goalCount,
    ] = await Promise.all([
      Member.countDocuments({ userId, isActive: true }),
      BankAccount.countDocuments({ userId, isActive: true }),
      Card.countDocuments({ userId, isActive: true }),
      Category.countDocuments({ userId, isActive: true }),
      Investment.countDocuments({ userId, isActive: true }),
      Goal.countDocuments({ userId, isActive: true }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        hasMembers: memberCount > 0,
        hasBankAccounts: bankAccountCount > 0,
        hasCards: cardCount > 0,
        hasCategories: categoryCount > 0,
        hasInvestments: investmentCount > 0,
        hasGoals: goalCount > 0,
        memberCount,
      },
    });
  } catch (error) {
    console.error('Error fetching setup status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch setup status' },
      { status: 500 }
    );
  }
}
