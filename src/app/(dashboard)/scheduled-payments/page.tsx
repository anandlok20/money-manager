'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  CalendarClock,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
  Building2,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
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
import { Frequency, AccountType, TransactionType } from '@/types';

interface ScheduledPayment {
  _id: string;
  name?: string;
  transactionType?: TransactionType;
  categoryId?: { name: string; icon?: string; color?: string };
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  amount: number;
  note?: string;
  isActive: boolean;
  failureCount?: number;
  lastError?: string;
  sourceType: AccountType;
  sourceBankId?: { bankName: string; accountHolderName: string };
  sourceCardId?: { cardName: string; last4Digits?: string };
  destinationType?: AccountType;
  destinationBankId?: { bankName: string; accountHolderName: string };
  destinationCardId?: { cardName: string; last4Digits?: string };
  destinationInvestmentId?: { name: string; type: string };
  memberId?: { name: string; type: string };
}

async function fetchScheduledPayments(): Promise<{ data: ScheduledPayment[] }> {
  const res = await fetch('/api/scheduled-payments?includeInactive=true');
  if (!res.ok) throw new Error('Failed to fetch scheduled payments');
  return res.json();
}

async function deleteScheduledPayment(id: string) {
  const res = await fetch(`/api/scheduled-payments/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete scheduled payment');
  }
  return res.json();
}

async function toggleScheduledPayment(id: string, isActive: boolean) {
  const res = await fetch(`/api/scheduled-payments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update scheduled payment');
  }
  return res.json();
}

const frequencyLabels: Record<Frequency, string> = {
  [Frequency.DAILY]: 'Daily',
  [Frequency.WEEKLY]: 'Weekly',
  [Frequency.MONTHLY]: 'Monthly',
  [Frequency.QUARTERLY]: 'Quarterly',
  [Frequency.YEARLY]: 'Yearly',
};

const txTypeConfig: Record<TransactionType, { label: string; color: string }> = {
  [TransactionType.EXPENSE]: { label: 'Expense', color: 'text-red-500' },
  [TransactionType.INCOME]: { label: 'Income', color: 'text-green-500' },
  [TransactionType.TRANSFER_SELF]: { label: 'Transfer', color: 'text-blue-500' },
  [TransactionType.INVESTMENT_CONTRIBUTION]: { label: 'Investment', color: 'text-purple-500' },
};

function TxTypeIcon({ type }: { type?: TransactionType }) {
  if (type === TransactionType.EXPENSE) return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
  if (type === TransactionType.INCOME) return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
  if (type === TransactionType.INVESTMENT_CONTRIBUTION) return <TrendingUp className="h-5 w-5 text-purple-500" />;
  return <ArrowLeftRight className="h-5 w-5 text-blue-500" />;
}

function getSourceLabel(payment: ScheduledPayment): string {
  if (payment.sourceType === AccountType.BANK && payment.sourceBankId) return payment.sourceBankId.bankName;
  if (payment.sourceType === AccountType.CARD && payment.sourceCardId) return payment.sourceCardId.cardName;
  return 'Unknown';
}

function getDestinationLabel(payment: ScheduledPayment): string {
  if (!payment.destinationType) return '';
  if (payment.destinationType === AccountType.BANK && payment.destinationBankId) return payment.destinationBankId.bankName;
  if (payment.destinationType === AccountType.CARD && payment.destinationCardId) return payment.destinationCardId.cardName;
  if (payment.destinationType === AccountType.INVESTMENT && payment.destinationInvestmentId) return payment.destinationInvestmentId.name;
  return '';
}

function getDestinationIcon(type?: AccountType) {
  if (type === AccountType.CARD) return CreditCard;
  if (type === AccountType.INVESTMENT) return TrendingUp;
  return Building2;
}

export default function ScheduledPaymentsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['scheduled-payments'],
    queryFn: fetchScheduledPayments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScheduledPayment,
    onSuccess: () => {
      toast.success('Scheduled payment deleted');
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleScheduledPayment(id, isActive),
    onSuccess: (_, variables) => {
      toast.success(`Scheduled payment ${variables.isActive ? 'activated' : 'paused'}`);
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load scheduled payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Scheduled Payments</h1>
            <p className="text-muted-foreground">Manage recurring payments and transfers</p>
          </div>
          <Link href="/scheduled-payments/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Scheduled Payment
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : data?.data.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No scheduled payments"
            description="Set up recurring payments to automate your finances."
            actionLabel="Add Scheduled Payment"
            actionHref="/scheduled-payments/new"
          />
        ) : (
          <div className="space-y-4">
            {data?.data.map((payment) => {
              const DestIcon = getDestinationIcon(payment.destinationType);
              const destLabel = getDestinationLabel(payment);
              const isAutoPaused = !payment.isActive && (payment.failureCount ?? 0) >= 3;
              const hasFailures = (payment.failureCount ?? 0) > 0;
              const txConfig = payment.transactionType ? txTypeConfig[payment.transactionType] : null;

              return (
                <Card key={payment._id} className={!payment.isActive ? 'opacity-70' : undefined}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {payment.transactionType ? (
                            <TxTypeIcon type={payment.transactionType} />
                          ) : (
                            <DestIcon className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base flex flex-wrap items-center gap-2">
                            <span className="truncate">
                              {payment.name || `${getSourceLabel(payment)}${destLabel ? ` → ${destLabel}` : ''}`}
                            </span>
                            {txConfig && (
                              <Badge variant="outline" className={`text-xs ${txConfig.color}`}>
                                {txConfig.label}
                              </Badge>
                            )}
                            {!payment.isActive && !isAutoPaused && (
                              <Badge variant="secondary" className="text-xs">Paused</Badge>
                            )}
                            {isAutoPaused && (
                              <Badge variant="destructive" className="text-xs">Auto-paused</Badge>
                            )}
                            {hasFailures && payment.isActive && (
                              <span
                                title={payment.lastError || 'Unknown error'}
                                className="inline-flex items-center gap-1 text-xs text-yellow-600 font-normal cursor-help"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {payment.failureCount} failure{(payment.failureCount ?? 0) > 1 ? 's' : ''}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {payment.categoryId && (
                              <span>{payment.categoryId.name}</span>
                            )}
                            {destLabel && (
                              <span>{getSourceLabel(payment)} → {destLabel}</span>
                            )}
                            {!destLabel && !payment.categoryId && (
                              <span>{getSourceLabel(payment)}</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => toggleMutation.mutate({ id: payment._id, isActive: !payment.isActive })}
                          >
                            {payment.isActive ? (
                              <><Pause className="mr-2 h-4 w-4" />Pause</>
                            ) : (
                              <><Play className="mr-2 h-4 w-4" />Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/scheduled-payments/${payment._id}/edit`}>
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
                                <AlertDialogTitle>Delete Scheduled Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this scheduled payment? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(payment._id)}
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
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-semibold">{formatCurrency(payment.amount, currency)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Frequency: </span>
                        <Badge variant="outline">{frequencyLabels[payment.frequency]}</Badge>
                      </div>
                      {payment.isActive && (
                        <div>
                          <span className="text-muted-foreground">Next: </span>
                          <span>{format(new Date(payment.nextRunDate), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                      {payment.lastRunDate && (
                        <div>
                          <span className="text-muted-foreground">Last run: </span>
                          <span>{format(new Date(payment.lastRunDate), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                      {payment.endDate && (
                        <div>
                          <span className="text-muted-foreground">Ends: </span>
                          <span>{format(new Date(payment.endDate), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                    </div>
                    {isAutoPaused && payment.lastError && (
                      <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                        {payment.lastError}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
