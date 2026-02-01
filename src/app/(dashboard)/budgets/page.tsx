'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Plus,
  PiggyBank,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';

interface Budget {
  _id: string;
  categoryId: {
    _id: string;
    name: string;
    color?: string;
    type: string;
  };
  amount: number;
  month: number;
  year: number;
}

interface Category {
  _id: string;
  name: string;
  type: string;
  color?: string;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  categoryId?: string;
  date: string;
}

async function fetchBudgets(month: number, year: number): Promise<Budget[]> {
  const response = await fetch(`/api/budgets?month=${month}&year=${year}`);
  if (!response.ok) throw new Error('Failed to fetch budgets');
  const data = await response.json();
  return data.data;
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories?type=EXPENSE');
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json();
  return data.data;
}

async function fetchTransactions(startDate: string, endDate: string): Promise<Transaction[]> {
  const response = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&type=expense&limit=1000`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  const data = await response.json();
  return data.data;
}

async function createBudget(data: { categoryId: string; amount: number; month: number; year: number }) {
  const response = await fetch('/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create budget');
  }
  return response.json();
}

async function updateBudget(id: string, data: { categoryId: string; amount: number; month: number; year: number }) {
  const response = await fetch(`/api/budgets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update budget');
  }
  return response.json();
}

async function deleteBudget(id: string) {
  const response = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete budget');
  }
  return response.json();
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAmount, setFormAmount] = useState('');

  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();
  const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', currentMonth, currentYear],
    queryFn: () => fetchBudgets(currentMonth, currentYear),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchCategories,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions-budget', monthStart, monthEnd],
    queryFn: () => fetchTransactions(monthStart, monthEnd),
  });

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      toast.success(editingBudget ? 'Budget updated' : 'Budget created');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      toast.success('Budget deleted');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Calculate spent amounts per category
  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.categoryId) {
        map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
      }
    });
    return map;
  }, [transactions]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => {
      const spent = spentByCategory.get(b.categoryId._id) || 0;
      return sum + spent;
    }, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overBudgetCount = budgets.filter((b) => {
      const spent = spentByCategory.get(b.categoryId._id) || 0;
      return spent > b.amount;
    }).length;

    return { totalBudget, totalSpent, totalRemaining, overBudgetCount };
  }, [budgets, spentByCategory]);

  // Available categories (not already budgeted)
  const availableCategories = useMemo(() => {
    const budgetedIds = new Set(budgets.map((b) => b.categoryId._id));
    return categories.filter((c) => !budgetedIds.has(c._id) || (editingBudget && editingBudget.categoryId._id === c._id));
  }, [categories, budgets, editingBudget]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const openCreateDialog = () => {
    setEditingBudget(null);
    setFormCategoryId('');
    setFormAmount('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormCategoryId(budget.categoryId._id);
    setFormAmount(budget.amount.toString());
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBudget(null);
    setFormCategoryId('');
    setFormAmount('');
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { categoryId: string; amount: number; month: number; year: number } }) => 
      updateBudget(id, data),
    onSuccess: () => {
      toast.success('Budget updated');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategoryId || !formAmount) {
      toast.error('Please fill all fields');
      return;
    }

    const budgetData = {
      categoryId: formCategoryId,
      amount: parseFloat(formAmount),
      month: currentMonth,
      year: currentYear,
    };

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget._id, data: budgetData });
    } else {
      createMutation.mutate(budgetData);
    }
  };

  const getStatusInfo = (budget: Budget) => {
    const spent = spentByCategory.get(budget.categoryId._id) || 0;
    const percentage = (spent / budget.amount) * 100;

    if (percentage >= 100) {
      return {
        status: 'over',
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        icon: AlertTriangle,
        label: 'Over Budget',
      };
    } else if (percentage >= 80) {
      return {
        status: 'warning',
        color: 'text-orange-600',
        bgColor: 'bg-orange-500',
        icon: AlertTriangle,
        label: 'Almost Reached',
      };
    } else {
      return {
        status: 'ok',
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        icon: CheckCircle2,
        label: 'On Track',
      };
    }
  };

  if (budgetsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-2xl font-bold">Budget Planning</h1>
          <p className="text-muted-foreground">
            Set and track your monthly spending limits
          </p>
        </div>
        <Button onClick={openCreateDialog} disabled={availableCategories.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Budget
        </Button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold min-w-48 text-center">
          {monthNames[currentMonth - 1]} {currentYear}
        </h2>
        <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              {budgets.length} categories budgeted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalSpent)}</div>
            <Progress 
              value={totals.totalBudget > 0 ? Math.min((totals.totalSpent / totals.totalBudget) * 100, 100) : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            {totals.totalRemaining >= 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.totalRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totals.overBudgetCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.overBudgetCount > 0 ? 'text-red-600' : ''}`}>
              {totals.overBudgetCount}
            </div>
            <p className="text-xs text-muted-foreground">
              categories exceeded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <Card>
        <CardHeader>
          <CardTitle>Category Budgets</CardTitle>
          <CardDescription>
            Track spending against your set limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No budgets set"
              description="Start by setting a budget for your expense categories"
              actionLabel="Add Budget"
              onAction={categories.length > 0 ? openCreateDialog : undefined}
            />
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => {
                const spent = spentByCategory.get(budget.categoryId._id) || 0;
                const percentage = Math.min((spent / budget.amount) * 100, 100);
                const remaining = budget.amount - spent;
                const statusInfo = getStatusInfo(budget);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={budget._id}
                    className="p-4 rounded-lg border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: budget.categoryId.color || '#6b7280' }}
                        />
                        <span className="font-semibold">{budget.categoryId.name}</span>
                        <Badge
                          variant={statusInfo.status === 'ok' ? 'default' : statusInfo.status === 'warning' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(budget)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(budget._id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Spent: <span className="font-medium text-foreground">{formatCurrency(spent)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Budget: <span className="font-medium text-foreground">{formatCurrency(budget.amount)}</span>
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className={`h-2 ${statusInfo.status === 'over' ? '[&>div]:bg-red-500' : statusInfo.status === 'warning' ? '[&>div]:bg-orange-500' : ''}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{percentage.toFixed(0)}% used</span>
                        <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? 'Edit Budget' : 'Set Budget'}
            </DialogTitle>
            <DialogDescription>
              {editingBudget
                ? 'Update the budget amount for this category'
                : `Set a spending limit for ${monthNames[currentMonth - 1]} ${currentYear}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formCategoryId}
                onValueChange={setFormCategoryId}
                disabled={!!editingBudget}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color || '#6b7280' }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Budget Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {editingBudget ? 'Update' : 'Set Budget'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This won&apos;t affect your transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
