'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils/currency';
import { TransactionType } from '@/types';

const NetWorthHistoryChart = dynamic(
  () => import('@/components/dashboard/NetWorthHistory').then((mod) => ({ default: mod.NetWorthHistoryChart })),
  { loading: () => <Skeleton className="h-[300px] w-full" />, ssr: false }
);

interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  description: string;
  dateTime: string;
  categoryId?: string;
  memberId?: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
  color?: string;
}

interface Member {
  _id: string;
  name: string;
}

async function fetchTransactions(startDate: string, endDate: string): Promise<Transaction[]> {
  const response = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  const data = await response.json();
  return data.data;
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json();
  return data.data;
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members');
  if (!response.ok) throw new Error('Failed to fetch members');
  const data = await response.json();
  return data.data;
}

const months = [
  { value: '0', label: 'This Month' },
  { value: '1', label: 'Last Month' },
  { value: '2', label: '2 Months Ago' },
  { value: '3', label: '3 Months Ago' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '12 Months' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('0');
  
  const { startDate, endDate } = useMemo(() => {
    const monthsAgo = parseInt(period);
    if (monthsAgo <= 3) {
      const date = subMonths(new Date(), monthsAgo);
      return {
        startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
      };
    }
    // For 6 or 12 months, show range
    return {
      startDate: format(startOfMonth(subMonths(new Date(), monthsAgo - 1)), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    };
  }, [period]);

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions-report', startDate, endDate],
    queryFn: () => fetchTransactions(startDate, endDate),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expenses, savings, savingsRate };
  }, [transactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const expenseTransactions = transactions.filter((t) => t.type === TransactionType.EXPENSE);
    const categoryMap = new Map<string, number>();
    
    expenseTransactions.forEach((t) => {
      const key = t.categoryId || 'uncategorized';
      categoryMap.set(key, (categoryMap.get(key) || 0) + t.amount);
    });

    const breakdown = Array.from(categoryMap.entries())
      .map(([id, amount]) => {
        const category = categories.find((c) => c._id === id);
        return {
          id,
          name: category?.name || 'Uncategorized',
          color: category?.color || '#6b7280',
          amount,
          percentage: stats.expenses > 0 ? (amount / stats.expenses) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return breakdown;
  }, [transactions, categories, stats.expenses]);

  // Member breakdown
  const memberBreakdown = useMemo(() => {
    const memberMap = new Map<string, { income: number; expense: number }>();
    
    transactions.forEach((t) => {
      if (t.type === TransactionType.TRANSFER_SELF) return;
      const key = t.memberId || 'unassigned';
      const existing = memberMap.get(key) || { income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) {
        existing.income += t.amount;
      } else {
        existing.expense += t.amount;
      }
      memberMap.set(key, existing);
    });

    return Array.from(memberMap.entries())
      .map(([id, data]) => {
        const member = members.find((m) => m._id === id);
        return {
          id,
          name: member?.name || 'Unassigned',
          ...data,
        };
      })
      .sort((a, b) => b.expense - a.expense);
  }, [transactions, members]);

  // Daily trend
  const dailyTrend = useMemo(() => {
    const dayMap = new Map<string, { income: number; expense: number }>();
    
    transactions.forEach((t) => {
      if (t.type === TransactionType.TRANSFER_SELF) return;
      const day = format(parseISO(t.dateTime), 'MMM dd');
      const existing = dayMap.get(day) || { income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) {
        existing.income += t.amount;
      } else {
        existing.expense += t.amount;
      }
      dayMap.set(day, existing);
    });

    return Array.from(dayMap.entries())
      .map(([day, data]) => ({ day, ...data }))
      .slice(-14); // Last 14 days
  }, [transactions]);

  // Top expenses
  const topExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  if (transactionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Analyze your income, expenses, and spending patterns
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.income)}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t) => t.type === TransactionType.INCOME).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.expenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t) => t.type === TransactionType.EXPENSE).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
            {stats.savings >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.savings)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.savings >= 0 ? 'Surplus' : 'Deficit'} this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <Badge variant={stats.savingsRate >= 20 ? 'default' : 'secondary'}>
              {stats.savingsRate >= 20 ? 'Good' : 'Low'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.savingsRate.toFixed(1)}%
            </div>
            <Progress value={Math.min(stats.savingsRate, 100)} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="members">By Member</TabsTrigger>
          <TabsTrigger value="top">Top Expenses</TabsTrigger>
          <TabsTrigger value="networth">Net Worth</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown by Category</CardTitle>
              <CardDescription>
                See where your money is going
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No expenses recorded for this period
                </p>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map((cat) => (
                    <div key={cat.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                          <span className="text-muted-foreground ml-2">
                            ({cat.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={cat.percentage}
                        className="h-2"
                        style={{ '--progress-background': cat.color } as React.CSSProperties}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Family Member</CardTitle>
              <CardDescription>
                Track individual spending patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memberBreakdown.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions for this period
                </p>
              ) : (
                <div className="space-y-6">
                  {memberBreakdown.map((member) => (
                    <div key={member.id} className="space-y-2 p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">{member.name}</span>
                        <Badge variant="outline">
                          Net: {formatCurrency(member.income - member.expense)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Income</p>
                          <p className="text-lg font-medium text-green-600">
                            {formatCurrency(member.income)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Expenses</p>
                          <p className="text-lg font-medium text-red-600">
                            {formatCurrency(member.expense)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Expenses</CardTitle>
              <CardDescription>
                Your largest expense transactions this period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topExpenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No expenses recorded for this period
                </p>
              ) : (
                <div className="space-y-4">
                  {topExpenses.map((expense, index) => {
                    const category = categories.find((c) => c._id === expense.categoryId);
                    return (
                      <div
                        key={expense._id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{format(parseISO(expense.dateTime), 'MMM dd, yyyy')}</span>
                              {category && (
                                <>
                                  <span>•</span>
                                  <span>{category.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="networth">
          <NetWorthHistoryChart />
        </TabsContent>
      </Tabs>

      {/* Daily Trend */}
      {dailyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity (Last 14 Days)</CardTitle>
            <CardDescription>
              Income vs Expenses trend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyTrend.map((day) => (
                <div key={day.day} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-muted-foreground">{day.day}</span>
                  <div className="flex-1 flex gap-1">
                    {day.income > 0 && (
                      <div
                        className="h-6 bg-green-500 rounded"
                        style={{
                          width: `${Math.min((day.income / Math.max(stats.income, stats.expenses)) * 100, 100)}%`,
                        }}
                        title={`Income: ${formatCurrency(day.income)}`}
                      />
                    )}
                    {day.expense > 0 && (
                      <div
                        className="h-6 bg-red-500 rounded"
                        style={{
                          width: `${Math.min((day.expense / Math.max(stats.income, stats.expenses)) * 100, 100)}%`,
                        }}
                        title={`Expense: ${formatCurrency(day.expense)}`}
                      />
                    )}
                  </div>
                  <div className="w-32 text-right text-sm">
                    {day.income > 0 && (
                      <span className="text-green-600">+{formatCurrency(day.income)}</span>
                    )}
                    {day.income > 0 && day.expense > 0 && ' / '}
                    {day.expense > 0 && (
                      <span className="text-red-600">-{formatCurrency(day.expense)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
