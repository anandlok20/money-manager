import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { dashboardCache, userCacheKey } from '@/lib/cache/lru-cache';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import Card from '@/lib/mongodb/models/Card';
import Investment from '@/lib/mongodb/models/Investment';
import Asset from '@/lib/mongodb/models/Asset';
import Vehicle from '@/lib/mongodb/models/Vehicle';
import Transaction from '@/lib/mongodb/models/Transaction';
import Budget from '@/lib/mongodb/models/Budget';
import Goal, { GoalStatus } from '@/lib/mongodb/models/Goal';
import { TransactionType } from '@/types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

// Type for populated budget with category
interface PopulatedBudget {
  _id: string;
  categoryId: { _id: string; name: string } | string;
  amount: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberView = searchParams.get('memberView') === 'true' && session.user.isMemberUser;

    const cacheKey = userCacheKey(session.user.id, memberView ? 'dashboard-member' : 'dashboard');
    const cached = dashboardCache.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    await connectToDatabase();

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const sixMonthsAgo = startOfMonth(subMonths(now, 5));

    // Get all balances in parallel
    const [
      bankAccounts,
      cards,
      investments,
      assetTotal,
      vehicleTotal,
      recentTransactions,
      monthlyStats,
      expenseByCategory,
      monthlyTrends,
      budgets,
      activeGoals,
    ] = await Promise.all([
      // Bank accounts
      BankAccount.find({ userId, isActive: true })
        .select('bankName accountHolderName currentBalance')
        .lean(),

      // Cards
      Card.find({ userId, isActive: true })
        .select('cardName currentBalance')
        .lean(),

      // Investments
      Investment.find({ userId, isActive: true })
        .select('name type currentValue')
        .lean(),

      // Assets (FD, PPF, Real Estate, Gold, etc.)
      Asset.aggregate([
        { $match: { userId: { $eq: userId }, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$currentValue' } } },
      ]),

      // Vehicles: value (asset) and outstanding loans (liability)
      Vehicle.aggregate([
        { $match: { userId: { $eq: userId }, status: 'active' } },
        {
          $group: {
            _id: null,
            value: { $sum: { $ifNull: ['$currentValue', 0] } },
            loans: { $sum: { $cond: ['$hasLoan', { $ifNull: ['$loanAmount', 0] }, 0] } },
          },
        },
      ]),

      // Recent transactions
      Transaction.find({ userId })
        .sort({ dateTime: -1, createdAt: -1 })
        .limit(10)
        .populate('categoryId', 'name icon color type')
        .populate('memberId', 'name')
        .lean(),

      // Monthly income and expense
      Transaction.aggregate([
        {
          $match: {
            userId: { $eq: userId },
            dateTime: { $gte: monthStart, $lte: monthEnd },
            type: { $in: [TransactionType.INCOME, TransactionType.EXPENSE] },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),

      // Expense breakdown by category for current month
      Transaction.aggregate([
        {
          $match: {
            userId: { $eq: userId },
            type: TransactionType.EXPENSE,
            dateTime: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $unwind: { path: '$category', preserveNullAndEmptyArrays: true },
        },
        {
          $group: {
            _id: '$categoryId',
            name: { $first: { $ifNull: ['$category.name', 'Uncategorized'] } },
            value: { $sum: '$amount' },
          },
        },
        {
          $sort: { value: -1 },
        },
        {
          $limit: 8,
        },
      ]),

      // Monthly trends for last 6 months
      Transaction.aggregate([
        {
          $match: {
            userId: { $eq: userId },
            dateTime: { $gte: sixMonthsAgo },
            type: { $in: [TransactionType.INCOME, TransactionType.EXPENSE] },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$dateTime' },
              month: { $month: '$dateTime' },
              type: '$type',
            },
            total: { $sum: '$amount' },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]),

      // Active budgets for current month
      Budget.find({ 
        userId, 
        isActive: true,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      })
        .populate('categoryId', 'name')
        .lean() as unknown as Promise<PopulatedBudget[]>,

      // Active goals
      Goal.find({ userId, status: GoalStatus.ACTIVE })
        .select('name targetAmount currentAmount icon color deadline')
        .lean(),
    ]);

    // Calculate totals
    const totalBankBalance = bankAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0
    );
    const totalCardBalance = cards.reduce(
      (sum, card) => sum + card.currentBalance,
      0
    );
    const totalInvestmentValue = investments.reduce(
      (sum, inv) => sum + inv.currentValue,
      0
    );
    const totalAssetValue = assetTotal[0]?.total || 0;
    const totalVehicleValue = vehicleTotal[0]?.value || 0;
    const totalVehicleLoans = vehicleTotal[0]?.loans || 0;

    // Net worth = (Bank + Investment + Assets + Vehicles) - (Cards debt + Vehicle loans)
    const netWorth =
      totalBankBalance +
      totalInvestmentValue +
      totalAssetValue +
      totalVehicleValue -
      totalCardBalance -
      totalVehicleLoans;

    // Parse monthly stats
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    monthlyStats.forEach((stat) => {
      if (stat._id === TransactionType.INCOME) {
        monthlyIncome = stat.total;
      } else if (stat._id === TransactionType.EXPENSE) {
        monthlyExpense = stat.total;
      }
    });

    // Process monthly trends into chart-ready format
    const monthlyTrendMap = new Map<string, { income: number; expense: number }>();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      monthlyTrendMap.set(key, { income: 0, expense: 0 });
    }

    // Fill in actual data
    interface TrendItem {
      _id: { year: number; month: number; type: string };
      total: number;
    }
    monthlyTrends.forEach((item: TrendItem) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      const existing = monthlyTrendMap.get(key);
      if (existing) {
        if (item._id.type === TransactionType.INCOME) {
          existing.income = item.total;
        } else if (item._id.type === TransactionType.EXPENSE) {
          existing.expense = item.total;
        }
      }
    });

    // Convert to array format for charts
    const monthlyTrendData = Array.from(monthlyTrendMap.entries()).map(([key]) => {
      const data = monthlyTrendMap.get(key)!;
      const [year, month] = key.split('-').map(Number);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        month: monthNames[month - 1],
        income: data.income,
        expense: data.expense,
      };
    });

    // Calculate budget progress - Single aggregation query instead of N queries
    const budgetCategoryIds = budgets.map((budget) => 
      typeof budget.categoryId === 'object' && '_id' in budget.categoryId
        ? budget.categoryId._id
        : budget.categoryId
    );
    
    // Single query to get all spending by category
    const spendingByCategory = await Transaction.aggregate([
      {
        $match: {
          userId: { $eq: userId },
          type: TransactionType.EXPENSE,
          dateTime: { $gte: monthStart, $lte: monthEnd },
          categoryId: { $in: budgetCategoryIds },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          total: { $sum: '$amount' },
        },
      },
    ]);
    
    // Create lookup map for O(1) access
    const spendingMap = new Map(
      spendingByCategory.map((s) => [s._id?.toString(), s.total])
    );
    
    // Map budgets with spending data from the single query
    const budgetProgress = budgets.map((budget) => {
      const categoryId = typeof budget.categoryId === 'object' && '_id' in budget.categoryId
        ? budget.categoryId._id
        : budget.categoryId;
      
      const spentAmount = spendingMap.get(categoryId?.toString()) || 0;
      const categoryName = typeof budget.categoryId === 'object' && budget.categoryId?.name 
        ? budget.categoryId.name 
        : 'Overall';

      return {
        _id: budget._id.toString(),
        name: categoryName,
        category: categoryName,
        budgetAmount: budget.amount,
        spent: spentAmount,
        percentage: Math.round((spentAmount / budget.amount) * 100),
      };
    });

    // Process goals for dashboard
    const goalsProgress = activeGoals.map((goal) => {
      const progress = Math.min(
        Math.round((goal.currentAmount / goal.targetAmount) * 100),
        100
      );
      return {
        _id: goal._id.toString(),
        name: goal.name,
        icon: goal.icon,
        color: goal.color,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        remaining: goal.targetAmount - goal.currentAmount,
        progress,
        deadline: goal.deadline,
      };
    });

    // Calculate total goals progress
    const totalGoalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalGoalCurrent = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    // Personal summary for member view
    let personalSummary = null;
    if (memberView && session.user.memberId) {
      const memberObjectId = new mongoose.Types.ObjectId(session.user.memberId);

      const [personalStats, linkedBanks, linkedCards] = await Promise.all([
        // Member's personal income/expense for current month
        Transaction.aggregate([
          {
            $match: {
              userId: { $eq: userId },
              memberId: { $eq: memberObjectId },
              dateTime: { $gte: monthStart, $lte: monthEnd },
              type: { $in: [TransactionType.INCOME, TransactionType.EXPENSE] },
            },
          },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]),
        // Bank accounts linked to this member
        BankAccount.find({ userId, isActive: true, linkedMemberIds: memberObjectId })
          .select('currentBalance')
          .lean(),
        // Cards linked to this member
        Card.find({ userId, isActive: true, linkedMemberId: memberObjectId })
          .select('currentBalance')
          .lean(),
      ]);

      let personalIncome = 0;
      let personalExpense = 0;
      personalStats.forEach((s) => {
        if (s._id === TransactionType.INCOME) personalIncome = s.total;
        else if (s._id === TransactionType.EXPENSE) personalExpense = s.total;
      });

      const linkedBankBalance = linkedBanks.reduce((sum, b) => sum + b.currentBalance, 0);
      const linkedCardBalance = linkedCards.reduce((sum, c) => sum + c.currentBalance, 0);

      personalSummary = {
        monthlyIncome: personalIncome,
        monthlyExpense: personalExpense,
        monthlySavings: personalIncome - personalExpense,
        linkedBankBalance,
        linkedCardBalance,
        personalNetWorth: linkedBankBalance - linkedCardBalance,
      };
    }

    const responsePayload = {
      success: true,
      ...(personalSummary && { personalSummary }),
      data: {
        totalBankBalance,
        totalCardBalance,
        totalInvestmentValue,
        totalAssetValue,
        totalVehicleValue,
        totalVehicleLoans,
        netWorth,
        monthlyIncome,
        monthlyExpense,
        monthlySavings: monthlyIncome - monthlyExpense,
        savingsRate: monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100) : 0,
        bankAccounts: bankAccounts.map((a) => ({
          ...a,
          _id: a._id.toString(),
          displayName: `${a.bankName} (${a.accountHolderName})`,
        })),
        cards: cards.map((c) => ({ ...c, _id: c._id.toString() })),
        investments: investments.map((i) => ({ ...i, _id: i._id.toString() })),
        recentTransactions: recentTransactions.map((t) => ({
          ...t,
          _id: t._id.toString(),
        })),
        // Chart data
        expenseByCategory: expenseByCategory.map((item) => ({
          name: item.name,
          value: item.value,
        })),
        monthlyTrends: monthlyTrendData,
        budgetProgress,
        // Goals data
        goalsProgress,
        totalGoalTarget,
        totalGoalCurrent,
        goalsCount: activeGoals.length,
      },
    };
    dashboardCache.set(cacheKey, responsePayload);
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
