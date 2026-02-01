import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Budget from '@/lib/mongodb/models/Budget';
import Transaction from '@/lib/mongodb/models/Transaction';
import { TransactionType } from '@/types';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface BudgetAlert {
  _id: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  remaining: number;
  status: 'safe' | 'warning' | 'danger' | 'exceeded';
  message: string;
}

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
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get active budgets for current month
    const budgets = await Budget.find({
      userId,
      isActive: true,
      month: currentMonth,
      year: currentYear,
    }).populate('categoryId', 'name');

    if (budgets.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          alerts: [],
          summary: {
            total: 0,
            safe: 0,
            warning: 0,
            danger: 0,
            exceeded: 0,
          },
        },
      });
    }

    // Calculate spending for each budget
    const alerts: BudgetAlert[] = await Promise.all(
      budgets.map(async (budget) => {
        const spending = await Transaction.aggregate([
          {
            $match: {
              userId: { $eq: userId },
              categoryId: budget.categoryId._id || budget.categoryId,
              type: TransactionType.EXPENSE,
              dateTime: { $gte: monthStart, $lte: monthEnd },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ]);

        const spent = spending[0]?.total || 0;
        const percentage = Math.round((spent / budget.amount) * 100);
        const remaining = budget.amount - spent;

        let status: BudgetAlert['status'] = 'safe';
        let message = '';

        if (percentage >= 100) {
          status = 'exceeded';
          message = `You've exceeded your budget by ${Math.abs(remaining).toFixed(0)}`;
        } else if (percentage >= 90) {
          status = 'danger';
          message = `Only ${remaining.toFixed(0)} remaining (${100 - percentage}%)`;
        } else if (percentage >= 75) {
          status = 'warning';
          message = `You've used ${percentage}% of your budget`;
        } else {
          status = 'safe';
          message = `${remaining.toFixed(0)} remaining`;
        }

        const categoryName = typeof budget.categoryId === 'object' && budget.categoryId?.name
          ? budget.categoryId.name
          : 'Unknown';

        return {
          _id: budget._id.toString(),
          categoryName,
          budgetAmount: budget.amount,
          spent,
          percentage,
          remaining,
          status,
          message,
        };
      })
    );

    // Sort by status (exceeded first, then danger, warning, safe)
    const statusOrder = { exceeded: 0, danger: 1, warning: 2, safe: 3 };
    alerts.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    // Calculate summary
    const summary = {
      total: alerts.length,
      safe: alerts.filter((a) => a.status === 'safe').length,
      warning: alerts.filter((a) => a.status === 'warning').length,
      danger: alerts.filter((a) => a.status === 'danger').length,
      exceeded: alerts.filter((a) => a.status === 'exceeded').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary,
      },
    });
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch budget alerts' },
      { status: 500 }
    );
  }
}
