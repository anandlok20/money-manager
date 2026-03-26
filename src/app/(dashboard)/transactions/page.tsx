'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Upload,
  X,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';
import { formatRelativeDate } from '@/lib/utils/dates';
import { TransactionType } from '@/types';
import { cn } from '@/lib/utils';

interface Transaction {
  _id: string;
  dateTime: string;
  amount: number;
  type: TransactionType;
  note?: string;
  description?: string;
  tags?: string[];
  categoryId?: {
    _id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  };
  memberId?: {
    _id: string;
    name: string;
  };
  sourceBankId?: {
    bankName: string;
    accountHolderName: string;
  };
  sourceCardId?: {
    cardName: string;
  };
  destinationBankId?: {
    bankName: string;
  };
  destinationCardId?: {
    cardName: string;
  };
}

interface Category {
  _id: string;
  name: string;
  type: string;
}

interface Member {
  _id: string;
  name: string;
}

interface TransactionsResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchTransactions(
  page: number,
  filters: {
    type?: string;
    categoryId?: string;
    memberId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    minAmount?: number;
    maxAmount?: number;
  }
): Promise<TransactionsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
  });
  
  if (filters.type && filters.type !== 'ALL') params.set('type', filters.type);
  if (filters.categoryId && filters.categoryId !== 'ALL') params.set('categoryId', filters.categoryId);
  if (filters.memberId && filters.memberId !== 'ALL') params.set('memberId', filters.memberId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.search) params.set('search', filters.search);
  if (filters.minAmount) params.set('minAmount', filters.minAmount.toString());
  if (filters.maxAmount) params.set('maxAmount', filters.maxAmount.toString());

  const response = await fetch(`/api/transactions?${params}`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json();
  return data.data || [];
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members');
  if (!response.ok) throw new Error('Failed to fetch members');
  const data = await response.json();
  return data.data || [];
}

const transactionTypeLabels = {
  [TransactionType.INCOME]: 'Income',
  [TransactionType.EXPENSE]: 'Expense',
  [TransactionType.TRANSFER_SELF]: 'Transfer',
  [TransactionType.INVESTMENT_CONTRIBUTION]: 'Investment',
};

export default function TransactionsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  
  // State
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [memberFilter, setMemberFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', page, typeFilter, categoryFilter, memberFilter, searchQuery, startDate, endDate, minAmount, maxAmount],
    queryFn: () => fetchTransactions(page, {
      type: typeFilter,
      categoryId: categoryFilter,
      memberId: memberFilter,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      search: searchQuery,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    }),
    staleTime: 30_000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 60_000,
    retry: 2,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
    staleTime: 60_000,
    retry: 2,
  });

  // Export handler
  const handleExport = useCallback(async (exportFormat: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ format: exportFormat });
      if (startDate) params.set('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.set('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await fetch(`/api/transactions/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      if (exportFormat === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Transactions exported successfully');
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Transactions exported successfully');
      }
    } catch {
      toast.error('Failed to export transactions');
    } finally {
      setIsExporting(false);
    }
  }, [startDate, endDate]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setMemberFilter('ALL');
    setSearchQuery('');
    setStartDate(undefined);
    setEndDate(undefined);
    setMinAmount('');
    setMaxAmount('');
    setPage(1);
  }, []);

  const hasActiveFilters = typeFilter !== 'ALL' || categoryFilter !== 'ALL' || 
    memberFilter !== 'ALL' || searchQuery || startDate || endDate || minAmount || maxAmount;

  const getTransactionIcon = useCallback((type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME:
        return <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case TransactionType.EXPENSE:
        return <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case TransactionType.TRANSFER_SELF:
      case TransactionType.INVESTMENT_CONTRIBUTION:
        return <ArrowLeftRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  }, []);

  const getTransactionColor = useCallback((type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME:
        return 'bg-green-100 dark:bg-green-900/20';
      case TransactionType.EXPENSE:
        return 'bg-red-100 dark:bg-red-900/20';
      case TransactionType.TRANSFER_SELF:
      case TransactionType.INVESTMENT_CONTRIBUTION:
        return 'bg-blue-100 dark:bg-blue-900/20';
    }
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load transactions. Please check your connection.</p>
        <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your financial transactions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={isExporting} className="rounded-xl">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 rounded-xl" align="end">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-lg hover:bg-muted/60"
                  onClick={() => handleExport('csv')}
                >
                  Export as CSV
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-lg hover:bg-muted/60"
                  onClick={() => handleExport('json')}
                >
                  Export as JSON
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Link href="/transactions/import">
            <Button variant="outline" className="gap-2 rounded-xl">
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </Link>
          <Link href="/transactions/new">
            <Button className="gap-2 shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <Card className="border-border/50">
        <CardContent className="py-5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-11 h-11 rounded-xl border-border/50 bg-background/50"
              />
            </div>

            {/* Quick Type Filter */}
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px] h-11 rounded-xl border-border/50">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                <SelectItem value={TransactionType.TRANSFER_SELF}>Transfer</SelectItem>
              </SelectContent>
            </Select>

            {/* Advanced Filters */}
            <div className="flex gap-2">
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 h-11 flex-1 sm:flex-none rounded-xl border-border/50">
                    <Filter className="h-4 w-4" />
                    <span className="sm:inline">Filters</span>
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 rounded-full text-xs">
                        Active
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
              <SheetContent className="rounded-l-2xl">
                <SheetHeader>
                  <SheetTitle className="text-xl">Advanced Filters</SheetTitle>
                  <SheetDescription>
                    Filter transactions by various criteria
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal rounded-xl">
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'MMM dd') : 'Start'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'MMM dd') : 'End'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Member */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Member</label>
                    <Select value={memberFilter} onValueChange={setMemberFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Members" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Members</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member._id} value={member._id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      Clear All
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setPage(1);
                        setIsFilterOpen(false);
                      }}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Clear filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {typeFilter !== 'ALL' && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm">
              Type: {transactionTypeLabels[typeFilter as TransactionType]}
              <button onClick={() => setTypeFilter('ALL')} className="p-0.5 hover:bg-muted rounded-full" aria-label="Clear type filter">
                <X className="h-4 w-4" />
              </button>
            </Badge>
          )}
          {categoryFilter !== 'ALL' && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm">
              Category: {categories.find(c => c._id === categoryFilter)?.name}
              <button onClick={() => setCategoryFilter('ALL')} className="p-0.5 hover:bg-muted rounded-full" aria-label="Clear category filter">
                <X className="h-4 w-4" />
              </button>
            </Badge>
          )}
          {memberFilter !== 'ALL' && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm">
              Member: {members.find(m => m._id === memberFilter)?.name}
              <button onClick={() => setMemberFilter('ALL')} className="p-0.5 hover:bg-muted rounded-full" aria-label="Clear member filter">
                <X className="h-4 w-4" />
              </button>
            </Badge>
          )}
          {startDate && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm">
              From: {format(startDate, 'MMM dd, yyyy')}
              <button onClick={() => setStartDate(undefined)} className="p-0.5 hover:bg-muted rounded-full" aria-label="Clear start date">
                <X className="h-4 w-4" />
              </button>
            </Badge>
          )}
          {endDate && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm">
              To: {format(endDate, 'MMM dd, yyyy')}
              <button onClick={() => setEndDate(undefined)} className="p-0.5 hover:bg-muted rounded-full" aria-label="Clear end date">
                <X className="h-4 w-4" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm">
              Search: {searchQuery}
              <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-muted rounded-full" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      {data && (
        <p className="text-sm text-muted-foreground">
          Showing {data.data.length} of {data.total} transactions
        </p>
      )}

      {/* Transactions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions"
          description={hasActiveFilters 
            ? "No transactions match your filters. Try adjusting or clearing them."
            : "Start tracking your finances by adding your first transaction."}
          actionLabel={hasActiveFilters ? "Clear Filters" : "Add Transaction"}
          actionHref={hasActiveFilters ? undefined : "/transactions/new"}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <div className="space-y-3">
          {data?.data.map((transaction) => (
            <Link
              key={transaction._id}
              href={`/transactions/${transaction._id}`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                        getTransactionColor(transaction.type)
                      )}
                    >
                      {getTransactionIcon(transaction.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {transaction.categoryId?.name ||
                            transaction.note ||
                            transaction.description ||
                            transactionTypeLabels[transaction.type]}
                        </p>
                        <Badge variant="outline" className="shrink-0">
                          {transactionTypeLabels[transaction.type]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatRelativeDate(transaction.dateTime)}</span>
                        {transaction.memberId && (
                          <>
                            <span>•</span>
                            <span>{transaction.memberId.name}</span>
                          </>
                        )}
                        {transaction.sourceBankId && (
                          <>
                            <span>•</span>
                            <span>{transaction.sourceBankId.bankName}</span>
                          </>
                        )}
                        {transaction.sourceCardId && (
                          <>
                            <span>•</span>
                            <span>{transaction.sourceCardId.cardName}</span>
                          </>
                        )}
                        {transaction.tags && transaction.tags.length > 0 && (
                          <>
                            <span>•</span>
                            {transaction.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    <p
                      className={cn(
                        'text-sm sm:text-base font-semibold shrink-0',
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
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
