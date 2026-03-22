'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Calendar, Percent, CreditCard, Car, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

interface Loan {
  _id: string;
  lender: string;
  loanType: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  disbursementDate: string;
  startDate: string;
  outstandingBalance: number;
  accountNumber?: string;
  status: 'active' | 'closed' | 'defaulted';
  notes?: string;
  linkedVehicleId?: { _id: string; make: string; model: string; registrationNumber?: string };
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  home: 'Home Loan',
  car: 'Car Loan',
  personal: 'Personal Loan',
  education: 'Education Loan',
  gold: 'Gold Loan',
  other: 'Other',
};

async function fetchLoan(id: string): Promise<Loan> {
  const res = await fetch(`/api/loans/${id}`);
  if (!res.ok) throw new Error('Failed to fetch loan');
  const data = await res.json();
  return data.data;
}

async function closeLoan(id: string) {
  const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to close loan');
  }
  return res.json();
}

export default function LoanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => fetchLoan(id),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeLoan(id),
    onSuccess: () => {
      toast.success('Loan marked as closed');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      router.push('/loans');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Loan not found.</p>
        <Link href="/loans">
          <Button variant="outline" className="mt-4">Back to Loans</Button>
        </Link>
      </div>
    );
  }

  const amountPaid = loan.principalAmount - loan.outstandingBalance;
  const paidPercent = Math.min(100, Math.round((amountPaid / loan.principalAmount) * 100));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/loans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{loan.lender}</h1>
            <p className="text-muted-foreground">{LOAN_TYPE_LABELS[loan.loanType] || loan.loanType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              loan.status === 'active' ? 'default' :
              loan.status === 'closed' ? 'secondary' : 'destructive'
            }
          >
            {loan.status}
          </Badge>
          {loan.status === 'active' && (
            <>
              <Link href={`/loans/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">Close Loan</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close Loan?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Mark this loan as closed. This will remove it from your liabilities.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => closeMutation.mutate()}
                      disabled={closeMutation.isPending}
                    >
                      Close Loan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Repayment Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repayment Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-medium">{paidPercent}%</span>
            </div>
            <Progress value={paidPercent} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Principal</p>
              <p className="font-semibold text-sm">{formatCurrency(loan.principalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount Paid</p>
              <p className="font-semibold text-sm text-emerald-600">{formatCurrency(amountPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-semibold text-sm text-destructive">{formatCurrency(loan.outstandingBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EMI Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">EMI Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly EMI</p>
                <p className="font-semibold">{formatCurrency(loan.emiAmount)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Percent className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Interest Rate</p>
                <p className="font-semibold">{loan.interestRate}% p.a.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disbursement Date</p>
                <p className="font-medium text-sm">{format(new Date(loan.disbursementDate), 'dd MMM yyyy')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">First EMI Date</p>
                <p className="font-medium text-sm">{format(new Date(loan.startDate), 'dd MMM yyyy')}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tenure</p>
              <p className="font-medium text-sm">{loan.tenureMonths} months</p>
            </div>
            {loan.accountNumber && (
              <div>
                <p className="text-xs text-muted-foreground">Account Number</p>
                <p className="font-medium text-sm font-mono">{loan.accountNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Linked Vehicle */}
      {loan.linkedVehicleId && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50">
                <Car className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Linked Vehicle</p>
                <p className="font-medium text-sm">
                  {loan.linkedVehicleId.make} {loan.linkedVehicleId.model}
                  {loan.linkedVehicleId.registrationNumber && ` — ${loan.linkedVehicleId.registrationNumber}`}
                </p>
              </div>
              <Link href={`/vehicles/${loan.linkedVehicleId._id}`} className="ml-auto">
                <Button variant="ghost" size="sm">View</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {loan.notes && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted/50">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{loan.notes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
