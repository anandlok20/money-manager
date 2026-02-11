'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calculator,
  FileText,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Receipt,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-600',
  calculated: 'bg-blue-500/10 text-blue-600',
  filed: 'bg-green-500/10 text-green-600',
  verified: 'bg-emerald-500/10 text-emerald-600',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  calculated: 'Calculated',
  filed: 'Filed',
  verified: 'Verified',
};

async function fetchTaxProfile(id: string) {
  const response = await fetch(`/api/tax/${id}`);
  if (!response.ok) throw new Error('Failed to fetch tax profile');
  const result = await response.json();
  return result.data;
}

async function deleteTaxProfile(id: string) {
  const response = await fetch(`/api/tax/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete tax profile');
  return response.json();
}

async function calculateTax(id: string) {
  const response = await fetch(`/api/tax/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoCalculate: true }),
  });
  if (!response.ok) throw new Error('Failed to calculate tax');
  return response.json();
}

export default function TaxProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['tax-profile', id],
    queryFn: () => fetchTaxProfile(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTaxProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-profiles'] });
      toast.success('Tax profile deleted');
      router.push('/tax');
    },
    onError: () => {
      toast.error('Failed to delete tax profile');
    },
  });

  const calculateMutation = useMutation({
    mutationFn: () => calculateTax(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-profile', id] });
      toast.success('Tax calculated successfully');
    },
    onError: () => {
      toast.error('Failed to calculate tax');
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Tax profile not found</p>
            <Button asChild className="mt-4">
              <Link href="/tax">Back to Tax Profiles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const taxPayableOrRefund = profile.taxPayable || 0;
  const isRefund = taxPayableOrRefund < 0 || profile.refundDue > 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tax">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">FY {profile.financialYear}</h1>
              <Badge className={statusColors[profile.status] || ''}>
                {statusLabels[profile.status] || profile.status}
              </Badge>
              <Badge variant="outline">
                {profile.regime === 'new' ? 'New Regime' : 'Old Regime'}
              </Badge>
            </div>
            <p className="text-muted-foreground">AY {profile.assessmentYear}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
          >
            {calculateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            Calculate Tax
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/tax/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Tax Profile?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the tax profile for FY {profile.financialYear}. This action cannot be undone.
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

      {/* Tax Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">
                {formatCurrency(profile.grossTotalIncome || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxable Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">
                {formatCurrency(profile.taxableIncome || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={isRefund ? 'border-green-500' : 'border-red-500'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRefund ? 'Refund Due' : 'Tax Payable'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isRefund ? (
                <TrendingDown className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className={`text-2xl font-bold ${isRefund ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(isRefund ? (profile.refundDue || Math.abs(taxPayableOrRefund)) : taxPayableOrRefund))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Breakdown */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Income Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Salary Income</span>
              <span className="font-medium">{formatCurrency(profile.salaryIncome || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">House Property Income</span>
              <span className="font-medium">{formatCurrency(profile.housePropertyIncome || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Capital Gains (Short Term)</span>
              <span className="font-medium">{formatCurrency(profile.capitalGains?.shortTerm || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Capital Gains (Long Term)</span>
              <span className="font-medium">{formatCurrency(profile.capitalGains?.longTerm || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Business Income</span>
              <span className="font-medium">{formatCurrency(profile.businessIncome || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Other Income</span>
              <span className="font-medium">{formatCurrency(profile.otherIncome || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center font-medium">
              <span>Gross Total Income</span>
              <span>{formatCurrency(profile.grossTotalIncome || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Deductions & Exemptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Standard Deduction</span>
              <span className="font-medium text-green-600">-{formatCurrency(profile.standardDeduction || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">HRA Exemption</span>
              <span className="font-medium text-green-600">-{formatCurrency(profile.hraExemption || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Exempt Income</span>
              <span className="font-medium text-green-600">-{formatCurrency(profile.exemptIncome || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center font-medium">
              <span>Total Deductions</span>
              <span className="text-green-600">-{formatCurrency(profile.totalDeductions || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section-wise Deductions */}
      {profile.deductions && profile.deductions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Section-wise Deductions</CardTitle>
            <CardDescription>Deductions claimed under various sections</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Max Limit</TableHead>
                  <TableHead className="text-right">Amount Claimed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.deductions.map((deduction: { section: string; description?: string; maxLimit?: number; amount: number }, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{deduction.section}</TableCell>
                    <TableCell className="text-muted-foreground">{deduction.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      {deduction.maxLimit ? formatCurrency(deduction.maxLimit) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(deduction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tax Calculation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Calculation
          </CardTitle>
          {profile.lastCalculatedAt && (
            <CardDescription>
              Last calculated: {format(new Date(profile.lastCalculatedAt), 'PPp')}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Taxable Income</span>
            <span className="font-medium">{formatCurrency(profile.taxableIncome || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tax Before Rebate</span>
            <span className="font-medium">{formatCurrency(profile.taxBeforeRebate || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Rebate u/s 87A</span>
            <span className="font-medium text-green-600">-{formatCurrency(profile.rebate87A || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tax After Rebate</span>
            <span className="font-medium">{formatCurrency(profile.taxAfterRebate || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Surcharge</span>
            <span className="font-medium">{formatCurrency(profile.surcharge || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Health & Education Cess (4%)</span>
            <span className="font-medium">{formatCurrency(profile.healthEducationCess || 0)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center font-medium text-lg">
            <span>Total Tax Liability</span>
            <span>{formatCurrency(profile.totalTaxLiability || 0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Taxes Paid */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Taxes Paid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">TDS Paid</span>
            <span className="font-medium text-green-600">{formatCurrency(profile.tdsPaid || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Advance Tax Paid</span>
            <span className="font-medium text-green-600">{formatCurrency(profile.advanceTaxPaid || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Self Assessment Tax</span>
            <span className="font-medium text-green-600">{formatCurrency(profile.selfAssessmentTax || 0)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center font-medium">
            <span>Total Taxes Paid</span>
            <span className="text-green-600">
              {formatCurrency((profile.tdsPaid || 0) + (profile.advanceTaxPaid || 0) + (profile.selfAssessmentTax || 0))}
            </span>
          </div>
          <Separator />
          <div className={`flex justify-between items-center font-medium text-lg ${isRefund ? 'text-green-600' : 'text-red-600'}`}>
            <span>{isRefund ? 'Refund Due' : 'Tax Payable'}</span>
            <span>{formatCurrency(Math.abs(profile.taxPayable || 0))}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {profile.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{profile.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Created: {format(new Date(profile.createdAt), 'PPp')}</span>
            <span>Updated: {format(new Date(profile.updatedAt), 'PPp')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
