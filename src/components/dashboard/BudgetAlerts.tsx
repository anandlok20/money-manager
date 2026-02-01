'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  const data = await response.json();
  return data.data;
}

interface BudgetAlertsProps {
  currency?: string;
  showAll?: boolean;
  compact?: boolean;
}

export function BudgetAlerts({ currency = 'INR', showAll = false, compact = false }: BudgetAlertsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['budget-alerts'],
    queryFn: fetchBudgetAlerts,
    refetchInterval: 60000, // Refetch every minute
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'danger':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <Badge variant="destructive">Exceeded</Badge>;
      case 'danger':
        return <Badge className="bg-red-400 hover:bg-red-400">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-black">Warning</Badge>;
      default:
        return <Badge className="bg-green-500 hover:bg-green-500">On Track</Badge>;
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return '[&>div]:bg-red-500';
      case 'danger':
        return '[&>div]:bg-red-400';
      case 'warning':
        return '[&>div]:bg-yellow-500';
      default:
        return '[&>div]:bg-green-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  // Filter to only show alerts that need attention if not showing all
  const alertsToShow = showAll
    ? data.alerts
    : data.alerts.filter((a) => a.status !== 'safe');

  if (alertsToShow.length === 0) {
    if (data.summary.total === 0) {
      return null; // No budgets configured
    }
    
    return (
      <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/10">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">
              All budgets on track
            </p>
            <p className="text-sm text-muted-foreground">
              {data.summary.safe} of {data.summary.total} budgets within limits
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // Compact view for dashboard
    const criticalCount = data.summary.exceeded + data.summary.danger;
    const warningCount = data.summary.warning;

    if (criticalCount === 0 && warningCount === 0) {
      return null;
    }

    return (
      <Card className={cn(
        criticalCount > 0 ? 'border-red-500/50 bg-red-50/50 dark:bg-red-950/10' : 
        'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10'
      )}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {criticalCount > 0 ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className={cn(
                  'font-medium',
                  criticalCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
                )}>
                  {criticalCount > 0 
                    ? `${criticalCount} budget${criticalCount > 1 ? 's' : ''} exceeded`
                    : `${warningCount} budget${warningCount > 1 ? 's' : ''} need attention`
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.alerts.filter(a => a.status !== 'safe').slice(0, 2).map(a => a.categoryName).join(', ')}
                </p>
              </div>
            </div>
            <Link href="/budgets">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Budget Alerts
            </CardTitle>
            <CardDescription>
              {data.summary.exceeded + data.summary.danger > 0
                ? `${data.summary.exceeded + data.summary.danger} budget${data.summary.exceeded + data.summary.danger > 1 ? 's need' : ' needs'} immediate attention`
                : `${data.summary.warning} budget${data.summary.warning > 1 ? 's' : ''} approaching limit`
              }
            </CardDescription>
          </div>
          <Link href="/budgets">
            <Button variant="outline" size="sm">Manage Budgets</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {alertsToShow.map((alert) => (
          <div
            key={alert._id}
            className={cn(
              'p-4 rounded-lg border',
              alert.status === 'exceeded' && 'border-red-500/50 bg-red-50/50 dark:bg-red-950/10',
              alert.status === 'danger' && 'border-red-400/50 bg-red-50/30 dark:bg-red-950/5',
              alert.status === 'warning' && 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10',
              alert.status === 'safe' && 'border-green-500/30 bg-green-50/30 dark:bg-green-950/5'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(alert.status)}
                <span className="font-medium">{alert.categoryName}</span>
              </div>
              {getStatusBadge(alert.status)}
            </div>
            
            <Progress 
              value={Math.min(alert.percentage, 100)} 
              className={cn('h-2 mb-2', getProgressColor(alert.status))}
            />
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {formatCurrency(alert.spent, currency)} of {formatCurrency(alert.budgetAmount, currency)}
              </span>
              <span className={cn(
                'font-medium',
                alert.status === 'exceeded' ? 'text-red-600 dark:text-red-400' :
                alert.status === 'danger' ? 'text-red-500 dark:text-red-400' :
                alert.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              )}>
                {alert.message}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
