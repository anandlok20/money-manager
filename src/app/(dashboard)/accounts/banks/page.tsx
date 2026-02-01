'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Building2, Plus, MoreVertical, Edit, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';

interface BankAccount {
  _id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  upiId?: string;
  ifscCode?: string;
  currentBalance: number;
  openingBalance: number;
  displayName: string;
}

async function fetchBankAccounts(): Promise<{ data: BankAccount[]; totalBalance: number }> {
  const response = await fetch('/api/accounts/banks');
  if (!response.ok) throw new Error('Failed to fetch bank accounts');
  const data = await response.json();
  return { data: data.data, totalBalance: data.totalBalance };
}

export default function BankAccountsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: fetchBankAccounts,
  });

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load bank accounts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts and track balances
          </p>
        </div>
        <Link href="/accounts/banks/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </Link>
      </div>

      {/* Total Balance Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Bank Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data?.totalBalance || 0, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Accounts List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : !data?.data || data.data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No bank accounts"
          description="Add your first bank account to start tracking your finances."
          actionLabel="Add Bank Account"
          actionHref="/accounts/banks/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((account) => (
            <Card key={account._id} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.bankName}</CardTitle>
                      <CardDescription>{account.accountHolderName}</CardDescription>
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
                        <Link href={`/accounts/banks/${account._id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Account Number */}
                {account.accountNumber && (
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="font-mono text-sm">****{account.accountNumber.slice(-4)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.preventDefault();
                        copyToClipboard(account.accountNumber!, `${account._id}-acc`);
                      }}
                    >
                      {copiedField === `${account._id}-acc` ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}

                {/* UPI ID */}
                {account.upiId && (
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">UPI ID</p>
                      <p className="font-mono text-sm">{account.upiId}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.preventDefault();
                        copyToClipboard(account.upiId!, `${account._id}-upi`);
                      }}
                    >
                      {copiedField === `${account._id}-upi` ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}

                {/* IFSC Code */}
                {account.ifscCode && (
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">IFSC Code</p>
                      <p className="font-mono text-sm">{account.ifscCode}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.preventDefault();
                        copyToClipboard(account.ifscCode!, `${account._id}-ifsc`);
                      }}
                    >
                      {copiedField === `${account._id}-ifsc` ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Balance */}
                <div className="pt-2 border-t">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(account.currentBalance, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Opening: {formatCurrency(account.openingBalance, currency)}
                  </p>
                </div>
              </CardContent>
              <Link
                href={`/accounts/banks/${account._id}`}
                className="absolute inset-0"
              >
                <span className="sr-only">View account</span>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
