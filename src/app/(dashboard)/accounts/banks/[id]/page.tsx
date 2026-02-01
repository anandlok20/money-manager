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
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
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

interface BankAccount {
  _id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  ifscCode?: string;
  currentBalance: number;
  openingBalance: number;
  displayName: string;
  linkedMemberIds?: { _id: string; name: string; type: string }[];
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

async function fetchBankAccount(id: string): Promise<BankAccount> {
  const response = await fetch(`/api/accounts/banks/${id}`);
  if (!response.ok) throw new Error('Failed to fetch bank account');
  const data = await response.json();
  return data.data;
}

async function deleteBankAccount(id: string) {
  const response = await fetch(`/api/accounts/banks/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete bank account');
  }
  return response.json();
}

export default function BankAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const id = params.id as string;

  const { data: account, isLoading, error } = useQuery({
    queryKey: ['bank-account', id],
    queryFn: () => fetchBankAccount(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBankAccount(id),
    onSuccess: () => {
      toast.success('Bank account deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      router.push('/accounts/banks');
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
        <p className="text-destructive">Failed to load bank account</p>
        <Link href="/accounts/banks">
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

  if (!account) return null;

  const balanceChange = account.currentBalance - account.openingBalance;
  const balanceChangePercent = account.openingBalance > 0 
    ? ((balanceChange / account.openingBalance) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounts/banks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{account.bankName}</h1>
            <p className="text-muted-foreground">{account.accountHolderName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/accounts/banks/${id}/edit`}>
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
                <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this bank account? This action cannot be undone.
                  All associated transactions will be preserved but unlinked from this account.
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

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <p className="text-4xl font-bold">
              {formatCurrency(account.currentBalance, currency)}
            </p>
            <div className={`flex items-center gap-1 pb-1 ${balanceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balanceChange >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange, currency)} ({balanceChangePercent}%)
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Opening Balance: {formatCurrency(account.openingBalance, currency)}
          </p>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {account.accountNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number</span>
                <span className="font-medium">****{account.accountNumber.slice(-4)}</span>
              </div>
            )}
            {account.ifscCode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IFSC Code</span>
                <span className="font-medium">{account.ifscCode}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">
                {format(new Date(account.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked Members</CardTitle>
          </CardHeader>
          <CardContent>
            {account.linkedMemberIds && account.linkedMemberIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {account.linkedMemberIds.map((member) => (
                  <Badge key={member._id} variant="secondary" className="gap-1">
                    <User className="h-3 w-3" />
                    {member.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No members linked</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Last 10 transactions for this account</CardDescription>
          </div>
          <Link href={`/transactions?sourceBankId=${id}`}>
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {account.recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-4">
              {account.recentTransactions.map((transaction) => (
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
