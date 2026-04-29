'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, CreditCard, Calendar, TrendingDown, Loader2, Edit, X, Eye } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
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

async function fetchLoans(): Promise<Loan[]> {
  const res = await fetch('/api/loans');
  if (!res.ok) throw new Error('Failed to fetch loans');
  const data = await res.json();
  return data.data;
}

function calculatePaidPercent(loan: Loan): number {
  if (loan.principalAmount === 0) return 100;
  const paid = loan.principalAmount - loan.outstandingBalance;
  return Math.min(100, Math.max(0, Math.round((paid / loan.principalAmount) * 100)));
}

export default function LoansPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');

  const { data: loans, isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: fetchLoans,
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to close loan');
    },
    onSuccess: () => {
      toast.success('Loan marked as closed');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: () => toast.error('Failed to close loan'),
  });

  const displayedLoans = loans?.filter((l) =>
    activeTab === 'active' ? l.status === 'active' : true
  );

  const totalOutstanding = loans
    ?.filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + l.outstandingBalance, 0) || 0;

  const totalEMI = loans
    ?.filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + l.emiAmount, 0) || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loans & EMIs</h1>
          <p className="text-muted-foreground">Track your outstanding loans and repayments</p>
        </div>
        <Button onClick={() => router.push('/loans/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Loan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monthly EMI Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalEMI)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('active')}
        >
          Active
        </Button>
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('all')}
        >
          All
        </Button>
      </div>

      {/* Loan List */}
      {!displayedLoans || displayedLoans.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No loans found. Add your first loan to track EMIs.</p>
            <Button className="mt-4" onClick={() => router.push('/loans/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedLoans.map((loan) => {
            const paidPct = calculatePaidPercent(loan);
            return (
              <Card key={loan._id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{loan.lender}</CardTitle>
                      <p className="text-sm text-muted-foreground">{LOAN_TYPE_LABELS[loan.loanType] || loan.loanType}</p>
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
                          <Link href={`/loans/${loan._id}`}>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => router.push(`/loans/${loan._id}/edit`)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <X className="h-3.5 w-3.5" />
                              </Button>
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
                                  onClick={() => closeMutation.mutate(loan._id)}
                                  disabled={closeMutation.isPending}
                                >
                                  {closeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Close Loan
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Principal</p>
                      <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outstanding</p>
                      <p className="font-medium text-destructive">{formatCurrency(loan.outstandingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly EMI</p>
                      <p className="font-medium">{formatCurrency(loan.emiAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interest Rate</p>
                      <p className="font-medium">{loan.interestRate}% p.a.</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Repaid {paidPct}%</span>
                      <span>{formatCurrency(loan.principalAmount - loan.outstandingBalance)} paid</span>
                    </div>
                    <Progress value={paidPct} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Since {format(new Date(loan.disbursementDate), 'MMM yyyy')}
                    {loan.accountNumber && ` · A/C ${loan.accountNumber}`}
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
