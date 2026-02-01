'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TrendingUp, Plus, MoreVertical, Edit, Trash2, PiggyBank, LineChart, Shield, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';
import { InvestmentType } from '@/types';

interface Investment {
  _id: string;
  name: string;
  type: InvestmentType;
  currentValue: number;
  isActive: boolean;
  createdAt: string;
}

async function fetchInvestments(): Promise<{ data: Investment[]; totalValue: number }> {
  const response = await fetch('/api/investments?includeInactive=true');
  if (!response.ok) throw new Error('Failed to fetch investments');
  return response.json();
}

async function deleteInvestment(id: string) {
  const response = await fetch(`/api/investments/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete investment');
  }
  return response.json();
}

const investmentTypeConfig = {
  [InvestmentType.MUTUAL_FUND]: { label: 'Mutual Fund', icon: PiggyBank, color: 'bg-blue-500' },
  [InvestmentType.INSURANCE]: { label: 'Insurance', icon: Shield, color: 'bg-green-500' },
  [InvestmentType.SHARE_MARKET]: { label: 'Share Market', icon: LineChart, color: 'bg-purple-500' },
  [InvestmentType.OTHER]: { label: 'Other', icon: Wallet, color: 'bg-gray-500' },
};

export default function InvestmentsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['investments'],
    queryFn: fetchInvestments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvestment,
    onSuccess: () => {
      toast.success('Investment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load investments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Investments</h1>
          <p className="text-muted-foreground">
            Track your investments and portfolio value
          </p>
        </div>
        <Link href="/investments/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Investment
          </Button>
        </Link>
      </div>

      {/* Total Value Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Portfolio Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(data?.totalValue || 0, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Investments List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No investments"
          description="Start tracking your investments to monitor your portfolio."
          actionLabel="Add Investment"
          actionHref="/investments/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((investment) => {
            const config = investmentTypeConfig[investment.type];
            const IconComponent = config.icon;

            return (
              <Card key={investment._id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{investment.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                          {!investment.isActive && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/investments/${investment._id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Investment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{investment.name}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(investment._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(investment.currentValue, currency)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Added {new Date(investment.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
