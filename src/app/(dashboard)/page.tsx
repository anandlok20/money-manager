'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Building2,
  CreditCard,
  ArrowRight,
  Plus,
  PieChart,
  BarChart3,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils/currency';
import { formatRelativeDate } from '@/lib/utils/dates';
import { TransactionType } from '@/types';
import { cn } from '@/lib/utils';
import { BudgetAlerts } from '@/components/dashboard/BudgetAlerts';
import { GettingStarted } from '@/components/dashboard/GettingStarted';

// Lazy load chart components for better initial page load
const ExpensePieChart = dynamic(() => import('@/components/dashboard/Charts').then(mod => ({ default: mod.ExpensePieChart })), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false,
});

const IncomeExpenseBarChart = dynamic(() => import('@/components/dashboard/Charts').then(mod => ({ default: mod.IncomeExpenseBarChart })), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false,
});

const SavingsRateGauge = dynamic(() => import('@/components/dashboard/Charts').then(mod => ({ default: mod.SavingsRateGauge })), {
  loading: () => <Skeleton className="h-[200px] w-full" />,
  ssr: false,
});

const BudgetProgressChart = dynamic(() => import('@/components/dashboard/Charts').then(mod => ({ default: mod.BudgetProgressChart })), {
  loading: () => <Skeleton className="h-[200px] w-full" />,
  ssr: false,
});

const NetWorthHistoryChart = dynamic(() => import('@/components/dashboard/NetWorthHistory').then(mod => ({ default: mod.NetWorthHistoryChart })), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false,
});

interface BudgetProgress {
  _id: string;
  name: string;
  category: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
}

interface GoalProgress {
  _id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  progress: number;
  deadline?: string;
}

interface DashboardData {
  totalBankBalance: number;
  totalCardBalance: number;
  totalInvestmentValue: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  savingsRate: number;
  bankAccounts: Array<{
    _id: string;
    bankName: string;
    accountHolderName: string;
    currentBalance: number;
    displayName: string;
  }>;
  cards: Array<{
    _id: string;
    cardName: string;
    currentBalance: number;
  }>;
  investments: Array<{
    _id: string;
    name: string;
    type: string;
    currentValue: number;
  }>;
  recentTransactions: Array<{
    _id: string;
    dateTime: string;
    amount: number;
    type: TransactionType;
    note?: string;
    categoryId?: {
      name: string;
      icon: string;
      color: string;
    };
  }>;
  expenseByCategory: Array<{
    name: string;
    value: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
  budgetProgress: BudgetProgress[];
  goalsProgress: GoalProgress[];
  totalGoalTarget: number;
  totalGoalCurrent: number;
  goalsCount: number;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/dashboard/summary');
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  const data = await response.json();
  return data.data;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardData,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Getting Started Guide for New Users */}
      <GettingStarted />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {session?.user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your financial overview
          </p>
        </div>
        <Link href="/transactions/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Net Worth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Worth
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(data?.netWorth || 0, currency)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bank Balance
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(data?.totalBankBalance || 0, currency)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month Income
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(data?.monthlyIncome || 0, currency)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Expense */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month Expense
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(data?.monthlyExpense || 0, currency)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card Balance (Debt) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credit Card Debt
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={cn(
                "text-2xl font-bold",
                (data?.totalCardBalance || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
              )}>
                {(data?.totalCardBalance || 0) > 0 ? '-' : ''}{formatCurrency(Math.abs(data?.totalCardBalance || 0), currency)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investments
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(data?.totalInvestmentValue || 0, currency)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Savings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Savings
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={cn(
                "text-2xl font-bold",
                (data?.monthlySavings || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatCurrency(data?.monthlySavings || 0, currency)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Savings Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={cn(
                "text-2xl font-bold",
                (data?.savingsRate || 0) >= 20 ? "text-green-600 dark:text-green-400" : 
                (data?.savingsRate || 0) >= 0 ? "text-yellow-600 dark:text-yellow-400" : 
                "text-red-600 dark:text-red-400"
              )}>
                {data?.savingsRate || 0}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts (Compact) */}
      <BudgetAlerts currency={currency} compact />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Expense by Category */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Expenses by Category</CardTitle>
              <CardDescription>This month&apos;s spending</CardDescription>
            </div>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-[180px] w-[180px] rounded-full" />
              </div>
            ) : data?.expenseByCategory && data.expenseByCategory.length > 0 ? (
              <ExpensePieChart data={data.expenseByCategory} currency={currency} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No expense data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income vs Expense Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Income vs Expenses</CardTitle>
              <CardDescription>Last 6 months trend</CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-end gap-2 justify-center">
                {[68, 85, 72, 95, 80, 90].map((height, i) => (
                  <Skeleton key={i} className="w-12" style={{ height: `${height}px` }} />
                ))}
              </div>
            ) : data?.monthlyTrends && data.monthlyTrends.length > 0 ? (
              <IncomeExpenseBarChart data={data.monthlyTrends} currency={currency} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No trend data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Savings Rate & Budget Progress */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Savings Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Savings Rate</CardTitle>
            <CardDescription>How much of your income you&apos;re saving</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[160px] flex items-center justify-center">
                <Skeleton className="h-[140px] w-[140px] rounded-full" />
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <SavingsRateGauge rate={data?.savingsRate || 0} />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">Income: {formatCurrency(data?.monthlyIncome || 0, currency)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Expenses: {formatCurrency(data?.monthlyExpense || 0, currency)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Savings: {formatCurrency(data?.monthlySavings || 0, currency)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Budget Progress</CardTitle>
              <CardDescription>Active budget tracking</CardDescription>
            </div>
            <Link href="/budgets">
              <Button variant="ghost" size="sm" className="gap-1">
                <Target className="h-4 w-4" />
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : data?.budgetProgress && data.budgetProgress.length > 0 ? (
              <div className="space-y-4">
                {data.budgetProgress.slice(0, 4).map((budget) => (
                  <div key={budget._id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{budget.name}</span>
                      <span className={cn(
                        budget.percentage > 100 ? 'text-red-500' : 
                        budget.percentage > 80 ? 'text-yellow-500' : 
                        'text-muted-foreground'
                      )}>
                        {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.budgetAmount, currency)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(budget.percentage, 100)} 
                      className={cn(
                        'h-2',
                        budget.percentage > 100 ? '[&>div]:bg-red-500' :
                        budget.percentage > 80 ? '[&>div]:bg-yellow-500' :
                        '[&>div]:bg-green-500'
                      )}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[120px] flex flex-col items-center justify-center text-muted-foreground">
                <p>No active budgets</p>
                <Link href="/budgets/new">
                  <Button variant="outline" size="sm" className="mt-2">
                    Create Budget
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Savings Goals</CardTitle>
            <CardDescription>
              {data?.goalsCount || 0} active goal{(data?.goalsCount || 0) !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Link href="/goals">
            <Button variant="ghost" size="sm" className="gap-1">
              <Target className="h-4 w-4" />
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : data?.goalsProgress && data.goalsProgress.length > 0 ? (
            <div className="space-y-4">
              {data.goalsProgress.slice(0, 3).map((goal) => (
                <div key={goal._id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{goal.icon}</span>
                      <span className="font-medium">{goal.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.currentAmount, currency)} / {formatCurrency(goal.targetAmount, currency)}
                    </span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{goal.progress}% complete</span>
                    <span>{formatCurrency(goal.remaining, currency)} remaining</span>
                  </div>
                </div>
              ))}
              {data.goalsCount > 3 && (
                <Link href="/goals" className="block text-center text-sm text-primary hover:underline">
                  View {data.goalsCount - 3} more goal{data.goalsCount - 3 !== 1 ? 's' : ''}
                </Link>
              )}
            </div>
          ) : (
            <div className="h-[100px] flex flex-col items-center justify-center text-muted-foreground">
              <p>No active goals</p>
              <Link href="/goals">
                <Button variant="outline" size="sm" className="mt-2">
                  Create Goal
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Worth History */}
      <NetWorthHistoryChart />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounts Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Your bank accounts and cards</CardDescription>
            </div>
            <Link href="/accounts/banks">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <>
                {/* Bank Accounts */}
                {data?.bankAccounts.slice(0, 3).map((account) => (
                  <Link
                    key={account._id}
                    href={`/accounts/banks/${account._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{account.bankName}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.accountHolderName}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(account.currentBalance, currency)}
                    </p>
                  </Link>
                ))}

                {/* Cards */}
                {data?.cards.slice(0, 2).map((card) => (
                  <Link
                    key={card._id}
                    href={`/accounts/cards/${card._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium">{card.cardName}</p>
                        <p className="text-sm text-muted-foreground">Credit Card</p>
                      </div>
                    </div>
                    <p className={cn(
                      'font-semibold',
                      card.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : ''
                    )}>
                      {formatCurrency(card.currentBalance, currency)}
                    </p>
                  </Link>
                ))}

                {(!data?.bankAccounts.length && !data?.cards.length) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No accounts yet</p>
                    <Link href="/accounts/banks/new">
                      <Button variant="outline" size="sm" className="mt-2">
                        Add your first account
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : (
              <>
                {data?.recentTransactions.slice(0, 5).map((transaction) => (
                  <Link
                    key={transaction._id}
                    href={`/transactions/${transaction._id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          transaction.type === TransactionType.INCOME
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : transaction.type === TransactionType.EXPENSE
                            ? 'bg-red-100 dark:bg-red-900/20'
                            : 'bg-blue-100 dark:bg-blue-900/20'
                        )}
                      >
                        {transaction.type === TransactionType.INCOME ? (
                          <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : transaction.type === TransactionType.EXPENSE ? (
                          <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {transaction.categoryId?.name || transaction.note || 'Transaction'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeDate(transaction.dateTime)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        'font-semibold',
                        transaction.type === TransactionType.INCOME
                          ? 'text-green-600 dark:text-green-400'
                          : transaction.type === TransactionType.EXPENSE
                          ? 'text-red-600 dark:text-red-400'
                          : ''
                      )}
                    >
                      {transaction.type === TransactionType.INCOME ? '+' : '-'}
                      {formatCurrency(transaction.amount, currency)}
                    </p>
                  </Link>
                ))}

                {!data?.recentTransactions.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No transactions yet</p>
                    <Link href="/transactions/new">
                      <Button variant="outline" size="sm" className="mt-2">
                        Add your first transaction
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Investments Section */}
      {(isLoading || (data?.investments && data.investments.length > 0)) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Investments</CardTitle>
              <CardDescription>Your investment portfolio</CardDescription>
            </div>
            <Link href="/investments">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data?.investments.slice(0, 3).map((investment) => (
                  <div
                    key={investment._id}
                    className="p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{investment.name}</p>
                      <Badge variant="secondary">{investment.type}</Badge>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(investment.currentValue, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
