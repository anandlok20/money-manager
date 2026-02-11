'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NetWorthData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: {
    bankAccounts: number;
    cards: number;
    investments: number;
    cash: number;
  };
  history: Array<{
    date: string;
    month: string;
    netWorth: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
    breakdown: {
      bankAccounts: number;
      cards: number;
      investments: number;
      cash: number;
    } | null;
  }>;
  growth: {
    absolute: number;
    percentage: number;
    periodMonths: number;
  } | null;
}

async function fetchNetWorthHistory(months: number): Promise<NetWorthData> {
  const response = await fetch(`/api/dashboard/net-worth?history=true&months=${months}`);
  if (!response.ok) throw new Error('Failed to fetch net worth history');
  const data = await response.json();
  return data.data;
}

async function saveSnapshot(): Promise<void> {
  const response = await fetch('/api/dashboard/net-worth', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to save snapshot');
}

// Define tooltip component outside of render to avoid React Compiler issues
const NetWorthTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono">
            {entry.value !== null ? formatCurrency(entry.value) : 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
};

export function NetWorthHistoryChart() {
  const queryClient = useQueryClient();
  const [months, setMonths] = useState<number>(12);

  const { data, isLoading, error } = useQuery({
    queryKey: ['net-worth-history', months],
    queryFn: () => fetchNetWorthHistory(months),
  });

  const snapshotMutation = useMutation({
    mutationFn: saveSnapshot,
    onSuccess: () => {
      toast.success('Net worth snapshot saved!');
      queryClient.invalidateQueries({ queryKey: ['net-worth-history'] });
    },
    onError: () => {
      toast.error('Failed to save snapshot');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net Worth History</CardTitle>
          <CardDescription>Failed to load net worth history</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Filter out null values for the chart
  const chartData = data.history?.filter((h) => h.netWorth !== null) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Net Worth History
              {data.growth && (
                <Badge
                  variant={data.growth.absolute >= 0 ? 'default' : 'destructive'}
                  className={cn(
                    data.growth.absolute >= 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  )}
                >
                  {data.growth.absolute >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {data.growth.percentage >= 0 ? '+' : ''}
                  {data.growth.percentage.toFixed(1)}%
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Track your wealth over time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
              <TabsList className="h-8">
                <TabsTrigger value="6" className="text-xs px-2">6M</TabsTrigger>
                <TabsTrigger value="12" className="text-xs px-2">1Y</TabsTrigger>
                <TabsTrigger value="24" className="text-xs px-2">2Y</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={() => snapshotMutation.mutate()}
              disabled={snapshotMutation.isPending}
            >
              {snapshotMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <span className="ml-1 hidden sm:inline">Save Snapshot</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current Net Worth Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Net Worth</p>
            <p className={cn(
              'text-xl font-bold',
              data.netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {formatCurrency(data.netWorth)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Assets</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(data.totalAssets)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Liabilities</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(data.totalLiabilities)}
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-4 gap-2 mb-6 text-sm">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
            <p className="text-xs text-muted-foreground">Banks</p>
            <p className="font-medium">{formatCurrency(data.breakdown.bankAccounts)}</p>
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
            <p className="text-xs text-muted-foreground">Investments</p>
            <p className="font-medium">{formatCurrency(data.breakdown.investments)}</p>
          </div>
          <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
            <p className="text-xs text-muted-foreground">Card Debt</p>
            <p className="font-medium text-orange-600">{formatCurrency(data.breakdown.cards)}</p>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
            <p className="text-xs text-muted-foreground">Cash</p>
            <p className="font-medium">{formatCurrency(data.breakdown.cash)}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  className="text-muted-foreground"
                />
                <Tooltip content={<NetWorthTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalAssets"
                  name="Assets"
                  stroke="#3b82f6"
                  fill="url(#assetsGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  name="Net Worth"
                  stroke="#22c55e"
                  fill="url(#netWorthGradient)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="totalLiabilities"
                  name="Liabilities"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
            <div className="text-center">
              <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No history yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => snapshotMutation.mutate()}
                disabled={snapshotMutation.isPending}
              >
                Take your first snapshot
              </Button>
            </div>
          </div>
        )}

        {/* Growth Info */}
        {data.growth && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium">
                {months === 6 ? '6-month' : months === 12 ? '1-year' : '2-year'} change:
              </span>{' '}
              <span className={data.growth.absolute >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.growth.absolute >= 0 ? '+' : ''}
                {formatCurrency(data.growth.absolute)}
              </span>{' '}
              ({data.growth.percentage >= 0 ? '+' : ''}
              {data.growth.percentage.toFixed(1)}%)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
