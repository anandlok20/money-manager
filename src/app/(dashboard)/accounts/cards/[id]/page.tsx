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
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface CardAccount {
  _id: string;
  cardName: string;
  last4Digits?: string;
  cardType: 'credit' | 'debit';
  cardNetwork?: string;
  creditLimit?: number;
  currentOutstanding?: number;
  billingCycleDay?: number;
  linkedBankId?: { _id: string; bankName: string; accountHolderName: string };
  linkedMemberId?: { _id: string; name: string; type: string };
  createdAt: string;
  recentTransactions: Transaction[];
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  dateTime: string;
  note?: string;
  categoryId?: { name: string; icon?: string; color?: string };
}

async function fetchCard(id: string): Promise<CardAccount> {
  const response = await fetch(`/api/accounts/cards/${id}`);
  if (!response.ok) throw new Error('Failed to fetch card');
  const data = await response.json();
  return data.data;
}

async function deleteCard(id: string) {
  const response = await fetch(`/api/accounts/cards/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete card');
  }
  return response.json();
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const id = params.id as string;

  const { data: card, isLoading, error } = useQuery({
    queryKey: ['card', id],
    queryFn: () => fetchCard(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCard(id),
    onSuccess: () => {
      toast.success('Card deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      router.push('/accounts/cards');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load card</p>
        <Link href="/accounts/cards">
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

  if (!card) return null;

  const utilizationPercent = card.creditLimit && card.currentOutstanding
    ? (card.currentOutstanding / card.creditLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounts/cards">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{card.cardName}</h1>
              <Badge variant={card.cardType === 'credit' ? 'default' : 'secondary'}>
                {card.cardType === 'credit' ? 'Credit' : 'Debit'}
              </Badge>
            </div>
            {card.last4Digits && (
              <p className="text-muted-foreground">•••• {card.last4Digits}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/accounts/cards/${id}/edit`}>
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
                <AlertDialogTitle>Delete Card</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this card? This action cannot be undone.
                  All associated transactions will be preserved but unlinked from this card.
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

      {/* Credit Card Stats */}
      {card.cardType === 'credit' && card.creditLimit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credit Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {formatCurrency(card.currentOutstanding || 0, currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  of {formatCurrency(card.creditLimit, currency)} limit
                </p>
              </div>
              <Badge 
                variant={utilizationPercent > 80 ? 'destructive' : utilizationPercent > 50 ? 'secondary' : 'default'}
              >
                {utilizationPercent.toFixed(0)}% used
              </Badge>
            </div>
            <Progress 
              value={utilizationPercent} 
              className={utilizationPercent > 80 ? '[&>div]:bg-red-500' : utilizationPercent > 50 ? '[&>div]:bg-orange-500' : ''}
            />
            <p className="text-sm text-muted-foreground">
              Available: {formatCurrency(card.creditLimit - (card.currentOutstanding || 0), currency)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Card Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {card.cardNetwork && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{card.cardNetwork}</span>
              </div>
            )}
            {card.billingCycleDay && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Cycle</span>
                <span className="font-medium">{card.billingCycleDay}th of each month</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Added</span>
              <span className="font-medium">
                {format(new Date(card.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {card.linkedBankId && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{card.linkedBankId.bankName}</p>
                  <p className="text-sm text-muted-foreground">{card.linkedBankId.accountHolderName}</p>
                </div>
              </div>
            )}
            {card.linkedMemberId && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{card.linkedMemberId.name}</p>
                  <Badge variant="outline" className="text-xs">{card.linkedMemberId.type}</Badge>
                </div>
              </div>
            )}
            {!card.linkedBankId && !card.linkedMemberId && (
              <p className="text-muted-foreground text-sm">No linked accounts</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Last 10 transactions for this card</CardDescription>
          </div>
          <Link href={`/transactions?sourceCardId=${id}`}>
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {card.recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-4">
              {card.recentTransactions.map((transaction) => (
                <Link
                  key={transaction._id}
                  href={`/transactions/${transaction._id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium">
                        {transaction.categoryId?.name || transaction.note || 'Transaction'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transaction.dateTime), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <span className={`font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 
                    transaction.type === 'expense' ? 'text-red-600' : ''
                  }`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                    {formatCurrency(transaction.amount, currency)}
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
