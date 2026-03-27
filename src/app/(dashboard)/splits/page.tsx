'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle2, Clock, ExternalLink, Receipt, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/currency';

interface SplitItem {
  _id: string;
  name: string;
  memberId?: { _id: string; name: string } | null;
  amount: number;
  status: 'PENDING' | 'SETTLED';
  settledAt?: string;
  settlementTransactionId?: string;
}

interface SplitExpense {
  _id: string;
  totalAmount: number;
  yourShare: number;
  splits: SplitItem[];
  createdAt: string;
  transactionId: {
    _id: string;
    note?: string;
    dateTime: string;
    amount: number;
    categoryId?: string;
  } | null;
}

async function fetchSplits(status?: string): Promise<SplitExpense[]> {
  const url = status ? `/api/splits?status=${status}` : '/api/splits';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch splits');
  const data = await res.json();
  return data.data;
}

async function settleSplitItems(splitId: string, splitItemIds: string[]) {
  const res = await fetch(`/api/splits/${splitId}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ splitItemIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to settle');
  }
  return res.json();
}

function SplitCard({ split, onSettle, settlingIds }: {
  split: SplitExpense;
  onSettle: (splitId: string, itemId: string) => void;
  settlingIds: Set<string>;
}) {
  const pendingItems = split.splits.filter((s) => s.status === 'PENDING');
  const txDate = split.transactionId?.dateTime
    ? format(new Date(split.transactionId.dateTime), 'dd MMM yyyy')
    : format(new Date(split.createdAt), 'dd MMM yyyy');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">
              {split.transactionId?.note || 'Expense'}
            </p>
            <p className="text-xs text-muted-foreground">{txDate}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold">{formatCurrency(split.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">Your share: {formatCurrency(split.yourShare)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {pendingItems.map((item) => (
          <div key={item._id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-sm truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                disabled={settlingIds.has(item._id)}
                onClick={() => onSettle(split._id, item._id)}
              >
                {settlingIds.has(item._id) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Settle'
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SettledCard({ split }: { split: SplitExpense }) {
  const settledItems = split.splits.filter((s) => s.status === 'SETTLED');
  const txDate = split.transactionId?.dateTime
    ? format(new Date(split.transactionId.dateTime), 'dd MMM yyyy')
    : format(new Date(split.createdAt), 'dd MMM yyyy');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{split.transactionId?.note || 'Expense'}</p>
            <p className="text-xs text-muted-foreground">{txDate}</p>
          </div>
          <p className="font-semibold text-sm shrink-0">{formatCurrency(split.totalAmount)}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {settledItems.map((item) => (
          <div key={item._id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm truncate">{item.name}</p>
                {item.settledAt && (
                  <p className="text-xs text-muted-foreground">
                    Settled {format(new Date(item.settledAt), 'dd MMM yyyy')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-medium text-emerald-600">{formatCurrency(item.amount)}</span>
              {item.settlementTransactionId && (
                <Link href={`/transactions?highlight=${item.settlementTransactionId}`}>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SplitsPage() {
  const queryClient = useQueryClient();
  const [settlingIds, setSettlingIds] = useState<Set<string>>(new Set());

  const { data: allSplits, isLoading } = useQuery({
    queryKey: ['splits'],
    queryFn: () => fetchSplits(),
  });

  const settleMutation = useMutation({
    mutationFn: ({ splitId, itemId }: { splitId: string; itemId: string }) =>
      settleSplitItems(splitId, [itemId]),
    onMutate: ({ itemId }) => {
      setSettlingIds((prev) => new Set(prev).add(itemId));
    },
    onSuccess: () => {
      toast.success('Repayment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['splits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: (_data, _err, { itemId }) => {
      setSettlingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
  });

  const handleSettle = (splitId: string, itemId: string) => {
    settleMutation.mutate({ splitId, itemId });
  };

  const pendingSplits = allSplits?.filter((s) =>
    s.splits.some((item) => item.status === 'PENDING')
  ) ?? [];

  const settledSplits = allSplits?.filter((s) =>
    s.splits.every((item) => item.status === 'SETTLED')
  ) ?? [];

  const totalPending = pendingSplits.reduce(
    (sum, s) => sum + s.splits.filter((i) => i.status === 'PENDING').reduce((a, b) => a + b.amount, 0),
    0
  );

  const totalRecovered = settledSplits.reduce(
    (sum, s) => sum + s.splits.filter((i) => i.status === 'SETTLED').reduce((a, b) => a + b.amount, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recovered</p>
                <p className="text-xl font-bold">{formatCurrency(totalRecovered)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            Pending
            {pendingSplits.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {pendingSplits.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settled" className="flex-1">Settled</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))
          ) : pendingSplits.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No pending splits</p>
              <p className="text-xs text-muted-foreground mt-1">
                Split an expense when adding a new transaction
              </p>
            </div>
          ) : (
            pendingSplits.map((split) => (
              <SplitCard
                key={split._id}
                split={split}
                onSettle={handleSettle}
                settlingIds={settlingIds}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="settled" className="space-y-4 mt-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))
          ) : settledSplits.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No settled splits yet</p>
            </div>
          ) : (
            settledSplits.map((split) => (
              <SettledCard key={split._id} split={split} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
