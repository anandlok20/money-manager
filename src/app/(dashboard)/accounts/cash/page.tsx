'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format, subMonths, addMonths } from 'date-fns';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  SplitSquareVertical,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from 'next-auth/react';

const addCashSchema = z.object({
  type: z.enum(['in', 'out']),
  amount: z.number().positive('Amount must be positive'),
  memberId: z.string().optional(),
  cashPersonName: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
  isSplit: z.boolean().optional(),
  splitPercent: z.number().min(1).max(100).optional(),
});

type AddCashInput = z.infer<typeof addCashSchema>;

interface Member {
  _id: string;
  name: string;
}

interface CashTransaction {
  _id: string;
  type: 'INCOME' | 'EXPENSE';
  displayType?: 'INCOME' | 'EXPENSE'; // For member view: flipped to show from member's perspective
  amount: number;
  dateTime: string;
  note?: string;
  cashPersonName?: string;
  memberId?: { _id: string; name: string } | null;
  split?: {
    _id: string;
    direction: 'owed_to_me' | 'i_owe';
    splits: { status: 'PENDING' | 'SETTLED'; amount: number }[];
  } | null;
}

interface CashData {
  isMemberView: boolean;
  balance: number;
  totalIn: number;
  totalOut: number;
  monthlyIn: number;
  monthlyOut: number;
  transactions: CashTransaction[];
  selectedYear: number;
  selectedMonth: number;
}

async function fetchCash(year: number, month: number): Promise<CashData> {
  const res = await fetch(`/api/accounts/cash?year=${year}&month=${month}`);
  if (!res.ok) throw new Error('Failed to fetch cash data');
  const data = await res.json();
  return data.data;
}

async function fetchMembers(): Promise<Member[]> {
  const res = await fetch('/api/members');
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

async function addCashEntry(input: AddCashInput) {
  const res = await fetch('/api/accounts/cash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add cash entry');
  }
  return res.json();
}

export default function CashWalletPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const currency = session?.user?.currency ?? 'INR';

  // Month navigation
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1; // 1-12

  const goToPrevMonth = () => setSelectedDate((d) => subMonths(d, 1));
  const goToNextMonth = () => setSelectedDate((d) => addMonths(d, 1));
  const isCurrentMonth =
    selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1;

  const { data, isLoading } = useQuery({
    queryKey: ['cash-wallet', selectedYear, selectedMonth],
    queryFn: () => fetchCash(selectedYear, selectedMonth),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddCashInput>({
    resolver: zodResolver(addCashSchema),
    defaultValues: {
      type: 'in',
      isSplit: false,
      splitPercent: 100,
    },
  });

  const type = watch('type');
  const isSplit = watch('isSplit');
  const splitPercent = watch('splitPercent');
  const memberId = watch('memberId');

  const mutation = useMutation({
    mutationFn: addCashEntry,
    onSuccess: () => {
      toast.success(type === 'in' ? 'Cash received recorded' : 'Cash given recorded');
      queryClient.invalidateQueries({ queryKey: ['cash-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['splits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setOpen(false);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = (values: AddCashInput) => {
    mutation.mutate(values);
  };

  const isMemberView = data?.isMemberView ?? false;

  const getPersonName = (tx: CashTransaction) => {
    if (tx.memberId && typeof tx.memberId === 'object') return tx.memberId.name;
    return tx.cashPersonName ?? null;
  };

  // Use displayType for member view (flipped), fallback to tx.type
  const getTxDisplayType = (tx: CashTransaction) => tx.displayType ?? tx.type;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
            <Banknote className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {isMemberView ? 'Cash from Family' : 'Cash Wallet'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isMemberView ? 'Cash given to you or taken from you' : 'Track your physical cash'}
            </p>
          </div>
        </div>
        {!isMemberView && (
          <Button onClick={() => setOpen(true)} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-1" />
            Add Cash
          </Button>
        )}
      </div>

      {/* Total Cash Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isMemberView ? 'Cash You Hold' : 'Cash in Hand'}
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(data?.balance ?? 0, currency)}</p>
                )}
                {!isLoading && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isMemberView
                      ? `Received: ${formatCurrency(data?.totalIn ?? 0, currency)} · Returned: ${formatCurrency(data?.totalOut ?? 0, currency)}`
                      : `All time: +${formatCurrency(data?.totalIn ?? 0, currency)} / -${formatCurrency(data?.totalOut ?? 0, currency)}`}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Month selector + monthly stats */}
        <Card className="sm:col-span-2">
          <CardContent className="pt-4 pb-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-medium">
                {format(selectedDate, 'MMMM yyyy')}
                {isCurrentMonth && (
                  <span className="ml-1.5 text-xs text-muted-foreground">(this month)</span>
                )}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {/* Monthly stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    {isMemberView ? 'Received' : 'Cash In'}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <p className="text-base font-semibold text-emerald-600">
                      +{formatCurrency(data?.monthlyIn ?? 0, currency)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    {isMemberView ? 'Returned' : 'Cash Out'}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <p className="text-base font-semibold text-red-500">
                      -{formatCurrency(data?.monthlyOut ?? 0, currency)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {format(selectedDate, 'MMMM yyyy')} Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !data?.transactions.length ? (
            <div className="text-center py-12">
              <Banknote className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No cash transactions in {format(selectedDate, 'MMMM yyyy')}</p>
              {isCurrentMonth && !isMemberView && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tap &quot;Add Cash&quot; to record cash received or given
                </p>
              )}
              {isMemberView && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cash given to you will appear here
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {data.transactions.map((tx) => {
                const displayType = getTxDisplayType(tx);
                const isIn = displayType === 'INCOME';
                const person = getPersonName(tx);
                const pendingSplit = tx.split?.splits.some((s) => s.status === 'PENDING');

                // Labels differ for member view
                const inLabel = isMemberView ? 'Received' : 'Cash received';
                const outLabel = isMemberView ? 'Returned' : 'Cash given';
                const fromLabel = isMemberView ? 'From family' : `From ${person}`;
                const toLabel = isMemberView ? 'Returned to family' : `To ${person}`;

                return (
                  <li key={tx._id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-full shrink-0 ${
                          isIn
                            ? 'bg-emerald-100 dark:bg-emerald-900/20'
                            : 'bg-red-100 dark:bg-red-900/20'
                        }`}
                      >
                        {isIn ? (
                          <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ArrowUpFromLine className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {person
                              ? isIn ? fromLabel : toLabel
                              : tx.note ?? (isIn ? inLabel : outLabel)}
                          </p>
                          {pendingSplit && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 gap-0.5">
                              <SplitSquareVertical className="h-2.5 w-2.5" />
                              {tx.split?.direction === 'i_owe' ? 'I owe' : 'Owed to me'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.dateTime), 'dd MMM yyyy')}
                          {person && tx.note ? ` · ${tx.note}` : ''}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`text-sm font-semibold shrink-0 ${
                        isIn ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {isIn ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add Cash Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="w-full sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Add Cash Entry</DialogTitle>
            <DialogDescription>Record cash you received or gave to someone</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === 'in' ? 'default' : 'outline'}
                className="h-10"
                onClick={() => setValue('type', 'in')}
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Received
              </Button>
              <Button
                type="button"
                variant={type === 'out' ? 'default' : 'outline'}
                className="h-10"
                onClick={() => setValue('type', 'out')}
              >
                <ArrowUpFromLine className="h-4 w-4 mr-2" />
                Gave
              </Button>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-10"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Person — member or free text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Member (optional)</Label>
                <Select
                  value={memberId ?? '__none__'}
                  onValueChange={(v) => setValue('memberId', v === '__none__' ? undefined : v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No member</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cashPersonName">Person name (optional)</Label>
                <Input
                  id="cashPersonName"
                  placeholder={type === 'in' ? 'Who gave you?' : 'Who did you give?'}
                  className="h-10"
                  {...register('cashPersonName')}
                />
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                placeholder="What was it for?"
                className="h-10"
                {...register('note')}
              />
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                className="h-10"
                defaultValue={new Date().toISOString().split('T')[0]}
                {...register('date')}
              />
            </div>

            {/* Split toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">
                  {type === 'in' ? 'I need to return this' : 'They need to return this'}
                </p>
                <p className="text-xs text-muted-foreground">Mark as to be returned</p>
              </div>
              <Switch
                checked={isSplit}
                onCheckedChange={(v) => setValue('isSplit', v)}
              />
            </div>

            {isSplit && (
              <div className="space-y-1">
                <Label htmlFor="splitPercent">Return % (default 100%)</Label>
                <Input
                  id="splitPercent"
                  type="number"
                  min={1}
                  max={100}
                  className="h-10"
                  {...register('splitPercent', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  {type === 'in'
                    ? `You need to return ${splitPercent ?? 100}% of the amount`
                    : `They need to return ${splitPercent ?? 100}% of the amount`}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10"
                onClick={() => { setOpen(false); reset(); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-10"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
