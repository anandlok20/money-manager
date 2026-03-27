'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LoanFormValues {
  lender: string;
  loanType: string;
  principalAmount: string;
  interestRate: string;
  tenureMonths: string;
  emiAmount: string;
  disbursementDate: string;
  startDate: string;
  outstandingBalance: string;
  accountNumber: string;
  notes: string;
}

// Reducing balance EMI formula
function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return principal / tenureMonths;
  const monthlyRate = annualRate / 12 / 100;
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  );
}

export default function NewLoanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loanType, setLoanType] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LoanFormValues>({
    defaultValues: {
      lender: '',
      loanType: '',
      principalAmount: '',
      interestRate: '',
      tenureMonths: '',
      emiAmount: '',
      disbursementDate: '',
      startDate: '',
      outstandingBalance: '',
      accountNumber: '',
      notes: '',
    },
  });

  const watchPrincipal = watch('principalAmount');
  const watchRate = watch('interestRate');
  const watchTenure = watch('tenureMonths');

  function autoCalculateEMI() {
    const p = parseFloat(watchPrincipal);
    const r = parseFloat(watchRate);
    const t = parseInt(watchTenure);
    if (p > 0 && r >= 0 && t > 0) {
      const emi = calculateEMI(p, r, t);
      setValue('emiAmount', Math.round(emi).toString());
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: LoanFormValues) => {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lender: data.lender,
          loanType: data.loanType,
          principalAmount: parseFloat(data.principalAmount),
          interestRate: parseFloat(data.interestRate),
          tenureMonths: parseInt(data.tenureMonths),
          emiAmount: parseFloat(data.emiAmount),
          disbursementDate: data.disbursementDate,
          startDate: data.startDate,
          outstandingBalance: parseFloat(data.outstandingBalance || data.principalAmount),
          accountNumber: data.accountNumber || undefined,
          notes: data.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create loan');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Loan added successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      router.push('/loans');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = handleSubmit((data) => mutation.mutate(data));

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/loans">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Loan</h1>
          <p className="text-muted-foreground">Track a new loan or EMI</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
          <CardDescription>Enter your loan information to track repayments and net worth impact</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Lender */}
            <div className="space-y-2">
              <Label htmlFor="lender">Lender *</Label>
              <Input
                id="lender"
                placeholder="e.g. HDFC Bank, SBI, LIC"
                {...register('lender', { required: 'Lender is required' })}
              />
              {errors.lender && <p className="text-xs text-destructive">{errors.lender.message}</p>}
            </div>

            {/* Loan Type */}
            <div className="space-y-2">
              <Label>Loan Type *</Label>
              <Select
                value={loanType}
                onValueChange={(v) => { setLoanType(v); setValue('loanType', v); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home Loan</SelectItem>
                  <SelectItem value="car">Car Loan</SelectItem>
                  <SelectItem value="personal">Personal Loan</SelectItem>
                  <SelectItem value="education">Education Loan</SelectItem>
                  <SelectItem value="gold">Gold Loan</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" {...register('loanType', { required: 'Loan type is required' })} />
              {errors.loanType && <p className="text-xs text-destructive">{errors.loanType.message}</p>}
            </div>

            {/* Principal + Outstanding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="principalAmount">Principal Amount (₹) *</Label>
                <Input
                  id="principalAmount"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 2000000"
                  {...register('principalAmount', { required: 'Required' })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outstandingBalance">Outstanding Balance (₹) *</Label>
                <Input
                  id="outstandingBalance"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Current balance owed"
                  {...register('outstandingBalance', { required: 'Required' })}
                />
              </div>
            </div>

            {/* Interest + Tenure */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (% p.a.) *</Label>
                <Input
                  id="interestRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 8.5"
                  {...register('interestRate', { required: 'Required' })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenureMonths">Tenure (months) *</Label>
                <Input
                  id="tenureMonths"
                  type="number"
                  min="1"
                  placeholder="e.g. 240"
                  {...register('tenureMonths', { required: 'Required' })}
                />
              </div>
            </div>

            {/* EMI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="emiAmount">Monthly EMI (₹) *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoCalculateEMI}
                  className="text-xs h-7"
                >
                  Auto-calculate
                </Button>
              </div>
              <Input
                id="emiAmount"
                type="number"
                min="0"
                step="any"
                placeholder="Monthly EMI amount"
                {...register('emiAmount', { required: 'Required' })}
              />
              <p className="text-xs text-muted-foreground">
                Fill principal, rate, and tenure then click Auto-calculate, or enter manually.
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="disbursementDate">Disbursement Date *</Label>
                <Input
                  id="disbursementDate"
                  type="date"
                  {...register('disbursementDate', { required: 'Required' })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">First EMI Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate', { required: 'Required' })}
                />
              </div>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Loan Account Number (Optional)</Label>
              <Input
                id="accountNumber"
                placeholder="e.g. HDFC12345678"
                {...register('accountNumber')}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details..."
                {...register('notes')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Loan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
