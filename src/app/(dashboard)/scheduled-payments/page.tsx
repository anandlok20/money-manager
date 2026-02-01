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
} from 'lucide-react';
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
import { Frequency, AccountType } from '@/types';

interface ScheduledPayment {
  _id: string;
  frequency: Frequency;
  startDate: string;
  nextRunDate: string;
  lastRunDate?: string;
  amount: number;
  note?: string;
  isActive: boolean;
  sourceType: AccountType;
  sourceBankId?: { bankName: string; accountHolderName: string };
  sourceCardId?: { cardName: string; last4Digits?: string };
  destinationType: AccountType;
  destinationBankId?: { bankName: string; accountHolderName: string };
  destinationCardId?: { cardName: string; last4Digits?: string };
  destinationInvestmentId?: { name: string; type: string };
  memberId?: { name: string; type: string };
}

async function fetchScheduledPayments(): Promise<{ data: ScheduledPayment[] }> {
  const response = await fetch('/api/scheduled-payments?includeInactive=true');
  if (!response.ok) throw new Error('Failed to fetch scheduled payments');
  return response.json();
}

async function deleteScheduledPayment(id: string) {
  const response = await fetch(`/api/scheduled-payments/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete scheduled payment');
  }
  return response.json();
}

async function toggleScheduledPayment(id: string, isActive: boolean) {
  const response = await fetch(`/api/scheduled-payments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update scheduled payment');
  }
  return response.json();
}

const frequencyLabels: Record<Frequency, string> = {
  [Frequency.DAILY]: 'Daily',
  [Frequency.WEEKLY]: 'Weekly',
  [Frequency.MONTHLY]: 'Monthly',
  [Frequency.QUARTERLY]: 'Quarterly',
  [Frequency.YEARLY]: 'Yearly',
};

function getSourceLabel(payment: ScheduledPayment): string {
  if (payment.sourceType === AccountType.BANK && payment.sourceBankId) {
    return payment.sourceBankId.bankName;
  }
  if (payment.sourceType === AccountType.CARD && payment.sourceCardId) {
    return payment.sourceCardId.cardName;
  }
  return 'Unknown';
}

function getDestinationLabel(payment: ScheduledPayment): string {
  if (payment.destinationType === AccountType.BANK && payment.destinationBankId) {
    return payment.destinationBankId.bankName;
  }
  if (payment.destinationType === AccountType.CARD && payment.destinationCardId) {
    return payment.destinationCardId.cardName;
  }
  if (payment.destinationType === AccountType.INVESTMENT && payment.destinationInvestmentId) {
    return payment.destinationInvestmentId.name;
  }
  return 'Unknown';
}

function getDestinationIcon(type: AccountType) {
  switch (type) {
    case AccountType.BANK:
      return Building2;
    case AccountType.CARD:
      return CreditCard;
    case AccountType.INVESTMENT:
      return TrendingUp;
    default:
      return Building2;
  }
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
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleScheduledPayment(id, isActive),
    onSuccess: (_, variables) => {
      toast.success(`Scheduled payment ${variables.isActive ? 'activated' : 'paused'}`);
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
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
          <p className="text-muted-foreground">
            Manage recurring payments and transfers
          </p>
        </div>
        <Link href="/scheduled-payments/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Scheduled Payment
          </Button>
        </Link>
      </div>

      {/* Payments List */}
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

            return (
              <Card key={payment._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <DestIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {payment.note || `${getSourceLabel(payment)} → ${getDestinationLabel(payment)}`}
                          {!payment.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Paused
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {getSourceLabel(payment)} → {getDestinationLabel(payment)}
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
                        <DropdownMenuItem
                          onClick={() =>
                            toggleMutation.mutate({
                              id: payment._id,
                              isActive: !payment.isActive,
                            })
                          }
                        >
                          {payment.isActive ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </>
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
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount: </span>
                      <span className="font-semibold">
                        {formatCurrency(payment.amount, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequency: </span>
                      <Badge variant="outline">{frequencyLabels[payment.frequency]}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next: </span>
                      <span>{new Date(payment.nextRunDate).toLocaleDateString()}</span>
                    </div>
                    {payment.lastRunDate && (
                      <div>
                        <span className="text-muted-foreground">Last run: </span>
                        <span>{new Date(payment.lastRunDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
