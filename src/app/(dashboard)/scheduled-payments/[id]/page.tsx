'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  CreditCard,
  TrendingUp,
  Play,
  Pause,
  User,
  ArrowRight,
  Clock,
  Calendar,
  RefreshCw,
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
  sourceBankId?: { _id: string; bankName: string; accountHolderName: string };
  sourceCardId?: { _id: string; cardName: string; last4Digits?: string };
  destinationType: AccountType;
  destinationBankId?: { _id: string; bankName: string; accountHolderName: string };
  destinationCardId?: { _id: string; cardName: string; last4Digits?: string };
  destinationInvestmentId?: { _id: string; name: string; type: string };
  memberId?: { _id: string; name: string; type: string };
  createdAt: string;
}

async function fetchScheduledPayment(id: string): Promise<ScheduledPayment> {
  const response = await fetch(`/api/scheduled-payments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch scheduled payment');
  const data = await response.json();
  return data.data;
}

async function deleteScheduledPayment(id: string) {
  const response = await fetch(`/api/scheduled-payments/${id}`, { method: 'DELETE' });
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

const frequencyColors: Record<Frequency, string> = {
  [Frequency.DAILY]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  [Frequency.WEEKLY]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  [Frequency.MONTHLY]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  [Frequency.QUARTERLY]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  [Frequency.YEARLY]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export default function ScheduledPaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const id = params.id as string;

  const { data: payment, isLoading, error } = useQuery({
    queryKey: ['scheduled-payment', id],
    queryFn: () => fetchScheduledPayment(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteScheduledPayment(id),
    onSuccess: () => {
      toast.success('Scheduled payment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      router.push('/scheduled-payments');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => toggleScheduledPayment(id, isActive),
    onSuccess: (_, isActive) => {
      toast.success(isActive ? 'Payment activated' : 'Payment paused');
      queryClient.invalidateQueries({ queryKey: ['scheduled-payment', id] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getSourceDisplay = () => {
    if (!payment) return null;
    if (payment.sourceType === AccountType.BANK && payment.sourceBankId) {
      return {
        icon: Building2,
        name: payment.sourceBankId.bankName,
        detail: payment.sourceBankId.accountHolderName,
        link: `/accounts/banks/${payment.sourceBankId._id}`,
      };
    }
    if (payment.sourceType === AccountType.CARD && payment.sourceCardId) {
      return {
        icon: CreditCard,
        name: payment.sourceCardId.cardName,
        detail: payment.sourceCardId.last4Digits ? `•••• ${payment.sourceCardId.last4Digits}` : undefined,
        link: `/accounts/cards/${payment.sourceCardId._id}`,
      };
    }
    if (payment.sourceType === AccountType.CASH) {
      return {
        icon: Building2,
        name: 'Cash',
        detail: undefined,
        link: undefined,
      };
    }
    return null;
  };

  const getDestinationDisplay = () => {
    if (!payment) return null;
    if (payment.destinationType === AccountType.BANK && payment.destinationBankId) {
      return {
        icon: Building2,
        name: payment.destinationBankId.bankName,
        detail: payment.destinationBankId.accountHolderName,
        link: `/accounts/banks/${payment.destinationBankId._id}`,
      };
    }
    if (payment.destinationType === AccountType.CARD && payment.destinationCardId) {
      return {
        icon: CreditCard,
        name: payment.destinationCardId.cardName,
        detail: payment.destinationCardId.last4Digits ? `•••• ${payment.destinationCardId.last4Digits}` : undefined,
        link: `/accounts/cards/${payment.destinationCardId._id}`,
      };
    }
    if (payment.destinationInvestmentId) {
      return {
        icon: TrendingUp,
        name: payment.destinationInvestmentId.name,
        detail: payment.destinationInvestmentId.type,
        link: `/investments/${payment.destinationInvestmentId._id}`,
      };
    }
    return null;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load scheduled payment</p>
        <Link href="/scheduled-payments">
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
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (!payment) return null;

  const source = getSourceDisplay();
  const destination = getDestinationDisplay();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/scheduled-payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {payment.note || 'Scheduled Payment'}
              </h1>
              <Badge 
                variant={payment.isActive ? 'default' : 'secondary'}
                className={payment.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
              >
                {payment.isActive ? 'Active' : 'Paused'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={frequencyColors[payment.frequency]}>
                {frequencyLabels[payment.frequency]}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => toggleMutation.mutate(!payment.isActive)}
            disabled={toggleMutation.isPending}
          >
            {payment.isActive ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Activate
              </>
            )}
          </Button>
          <Link href={`/scheduled-payments/${id}/edit`}>
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
                <AlertDialogTitle>Delete Scheduled Payment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this scheduled payment? This action cannot be undone.
                  Previously created transactions will not be affected.
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

      {/* Amount Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payment Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">
            {formatCurrency(payment.amount, currency)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <RefreshCw className="inline h-3 w-3 mr-1" />
            {frequencyLabels[payment.frequency]} payment
          </p>
        </CardContent>
      </Card>

      {/* Schedule Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-semibold">
                {format(new Date(payment.nextRunDate), 'MMM d, yyyy')}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(payment.nextRunDate), { addSuffix: true })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Start Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-semibold">
                {format(new Date(payment.startDate), 'MMM d, yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>

        {payment.lastRunDate && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Run
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {format(new Date(payment.lastRunDate), 'MMM d, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transfer Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Flow</CardTitle>
          <CardDescription>From source to destination</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            {/* Source */}
            {source && (
              <div className="flex-1">
                {source.link ? (
                  <Link href={source.link} className="block p-4 rounded-lg border hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <source.icon className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{source.name}</p>
                        {source.detail && (
                          <p className="text-sm text-muted-foreground">{source.detail}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <source.icon className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{source.name}</p>
                        {source.detail && (
                          <p className="text-sm text-muted-foreground">{source.detail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Arrow */}
            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />

            {/* Destination */}
            {destination && (
              <div className="flex-1">
                {destination.link ? (
                  <Link href={destination.link} className="block p-4 rounded-lg border hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <destination.icon className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{destination.name}</p>
                        {destination.detail && (
                          <p className="text-sm text-muted-foreground">{destination.detail}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <destination.icon className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{destination.name}</p>
                        {destination.detail && (
                          <p className="text-sm text-muted-foreground">{destination.detail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member */}
      {payment.memberId && (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Member</CardTitle>
          </CardHeader>
          <CardContent>
            <Link 
              href={`/members/${payment.memberId._id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{payment.memberId.name}</p>
                <Badge variant="outline" className="text-xs">{payment.memberId.type}</Badge>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frequency</span>
            <span className="font-medium">{frequencyLabels[payment.frequency]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={payment.isActive ? 'default' : 'secondary'}>
              {payment.isActive ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">
              {format(new Date(payment.createdAt), 'MMMM d, yyyy')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
