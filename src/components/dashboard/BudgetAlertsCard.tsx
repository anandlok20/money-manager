'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Bell,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';

interface BudgetAlert {
  _id: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  remaining: number;
  status: 'safe' | 'warning' | 'danger' | 'exceeded';
  message: string;
}

interface AlertsData {
  alerts: BudgetAlert[];
  summary: {
    total: number;
    safe: number;
    warning: number;
    danger: number;
    exceeded: number;
  };
}

async function fetchBudgetAlerts(): Promise<AlertsData> {
  const response = await fetch('/api/budgets/alerts');
  if (!response.ok) throw new Error('Failed to fetch budget alerts');
  const result = await response.json();
  return result.data;
}

const statusConfig = {
  safe: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    badgeVariant: 'default' as const,
    badgeClass: 'bg-green-500/10 text-green-600 hover:bg-green-500/10',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    badgeVariant: 'secondary' as const,
    badgeClass: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/10',
  },
  danger: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    badgeVariant: 'secondary' as const,
    badgeClass: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/10',
  },
  exceeded: {
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    badgeVariant: 'destructive' as const,
    badgeClass: 'bg-red-500/10 text-red-600 hover:bg-red-500/10',
  },
};

export function BudgetAlertsCard({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['budget-alerts'],
    queryFn: fetchBudgetAlerts,
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const { alerts, summary } = data;
  const hasAlerts = summary.warning > 0 || summary.danger > 0 || summary.exceeded > 0;
  const displayAlerts = compact ? alerts.slice(0, 3) : alerts;

  return (
    <Card className={hasAlerts ? 'border-amber-500/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className={`h-5 w-5 ${hasAlerts ? 'text-amber-600' : 'text-muted-foreground'}`} />
            <CardTitle className="text-base">Budget Alerts</CardTitle>
          </div>
          {hasAlerts && (
            <Badge variant="destructive">
              {summary.exceeded + summary.danger + summary.warning} alerts
            </Badge>
          )}
        </div>
        <CardDescription>
          {summary.exceeded > 0
            ? `${summary.exceeded} budget${summary.exceeded > 1 ? 's' : ''} exceeded`
            : hasAlerts
            ? 'Some budgets need attention'
            : 'All budgets on track'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-600" />
            <p className="text-sm">No active budgets to track</p>
            <Button asChild variant="link" className="mt-2">
              <Link href="/budgets">Set up budgets</Link>
            </Button>
          </div>
        ) : (
          <>
            {displayAlerts.map((alert) => {
              const config = statusConfig[alert.status];
              const StatusIcon = config.icon;

              return (
                <div key={alert._id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      <span className="font-medium">{alert.categoryName}</span>
                    </div>
                    <Badge className={config.badgeClass}>
                      {alert.percentage}%
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(alert.percentage, 100)}
                    className={`h-2 ${
                      alert.status === 'exceeded'
                        ? '[&>div]:bg-red-500'
                        : alert.status === 'danger'
                        ? '[&>div]:bg-orange-500'
                        : alert.status === 'warning'
                        ? '[&>div]:bg-amber-500'
                        : '[&>div]:bg-green-500'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(alert.spent)} / {formatCurrency(alert.budgetAmount)}
                    </span>
                    <span className={alert.remaining < 0 ? 'text-red-600' : ''}>
                      {alert.message}
                    </span>
                  </div>
                </div>
              );
            })}

            {compact && alerts.length > 3 && (
              <Button asChild variant="ghost" className="w-full">
                <Link href="/budgets">
                  View all {alerts.length} budgets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </>
        )}

        {!compact && alerts.length > 0 && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.safe}</div>
                <div className="text-xs text-muted-foreground">Safe</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{summary.warning}</div>
                <div className="text-xs text-muted-foreground">Warning</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{summary.danger}</div>
                <div className="text-xs text-muted-foreground">Danger</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{summary.exceeded}</div>
                <div className="text-xs text-muted-foreground">Exceeded</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BudgetAlertsCard;
