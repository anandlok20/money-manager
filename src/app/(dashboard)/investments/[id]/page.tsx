'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Coins,
  Building2,
  PiggyBank,
  Landmark,
  Bitcoin,
  Home,
  Gem,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency } from '@/lib/utils/currency';

interface Investment {
  _id: string;
  name: string;
  type: string;
  currentValue: number;
  investedAmount?: number;
  units?: number;
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
  recentTransactions: Transaction[];
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  dateTime: string;
  note?: string;
}

async function fetchInvestment(id: string): Promise<Investment> {
  const response = await fetch(`/api/investments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch investment');
  const data = await response.json();
  return data.data;
}

async function deleteInvestment(id: string) {
  const response = await fetch(`/api/investments/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete investment');
  }
  return response.json();
}

const investmentTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  stocks: { label: 'Stocks', icon: BarChart3, color: 'bg-blue-500' },
  mutual_funds: { label: 'Mutual Funds', icon: PiggyBank, color: 'bg-purple-500' },
  fixed_deposits: { label: 'Fixed Deposits', icon: Building2, color: 'bg-green-500' },
  ppf: { label: 'PPF', icon: Landmark, color: 'bg-yellow-500' },
  nps: { label: 'NPS', icon: Landmark, color: 'bg-orange-500' },
  real_estate: { label: 'Real Estate', icon: Home, color: 'bg-teal-500' },
  gold: { label: 'Gold', icon: Gem, color: 'bg-amber-500' },
  crypto: { label: 'Cryptocurrency', icon: Bitcoin, color: 'bg-orange-600' },
  other: { label: 'Other', icon: Coins, color: 'bg-gray-500' },
};

export default function InvestmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const id = params.id as string;

  const { data: investment, isLoading, error } = useQuery({
    queryKey: ['investment', id],
    queryFn: () => fetchInvestment(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvestment(id),
    onSuccess: () => {
      toast.success('Investment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
      router.push('/investments');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load investment</p>
        <Link href="/investments">
          <Button variant="outline">Go Back</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!investment) return null;

  const config = investmentTypeConfig[investment.type] || investmentTypeConfig.other;
  const IconComponent = config.icon;
  
  const investedAmount = investment.investedAmount || 0;
  const returns = investment.currentValue - investedAmount;
  const returnsPercent = investedAmount > 0 ? ((returns / investedAmount) * 100).toFixed(2) : 0;

  // Calculate total contributions from transactions
  const totalContributions = investment.recentTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/investments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{investment.name}</h1>
              <Badge variant="secondary">{config.label}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/investments/${id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Investment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this investment? This action cannot be undone.
                  All contribution transactions will be preserved but unlinked.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Current Value Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <p className="text-4xl font-bold">
              {formatCurrency(investment.currentValue, currency)}
            </p>
            {investedAmount > 0 && (
              <div className={`flex items-center gap-1 pb-1 ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {returns >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {returns >= 0 ? '+' : ''}{formatCurrency(returns, currency)} ({returnsPercent}%)
                </span>
              </div>
            )}
          </div>
          {investedAmount > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Invested: {formatCurrency(investedAmount, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(totalContributions, currency)}
            </p>
          </CardContent>
        </Card>

        {investment.units && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Units Held
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{investment.units}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{investment.recentTransactions?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{config.label}</span>
          </div>
          {investment.purchaseDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purchase Date</span>
              <span className="font-medium">
                {format(new Date(investment.purchaseDate), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Added</span>
            <span className="font-medium">
              {format(new Date(investment.createdAt), 'MMMM d, yyyy')}
            </span>
          </div>
          {investment.notes && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-sm">Notes</span>
              <p className="mt-1">{investment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Contributions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Contributions</CardTitle>
            <CardDescription>Investment transactions</CardDescription>
          </div>
          <Link href={`/transactions/new?destinationInvestmentId=${id}`}>
            <Button size="sm">Add Contribution</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!investment.recentTransactions || investment.recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No contributions yet</p>
          ) : (
            <div className="space-y-4">
              {investment.recentTransactions.map((transaction) => (
                <Link
                  key={transaction._id}
                  href={`/transactions/${transaction._id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">
                        {transaction.note || 'Investment Contribution'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transaction.dateTime), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-green-600">
                    +{formatCurrency(transaction.amount, currency)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
