'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { bankAccountSchema, type BankAccountInput } from '@/lib/validations/account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

async function createBankAccount(data: BankAccountInput) {
  const response = await fetch('/api/accounts/banks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create bank account');
  }

  return response.json();
}

export default function NewBankAccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankAccountInput>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      openingBalance: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: createBankAccount,
    onSuccess: () => {
      toast.success('Bank account created successfully');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      router.push('/accounts/banks');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: BankAccountInput) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/accounts/banks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Bank Account</h1>
          <p className="text-muted-foreground">
            Enter your bank account details
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            Fill in the details of your bank account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                placeholder="e.g., HDFC Bank"
                {...register('bankName')}
              />
              {errors.bankName && (
                <p className="text-sm text-destructive">{errors.bankName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountHolderName">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                placeholder="e.g., John Doe"
                {...register('accountHolderName')}
              />
              {errors.accountHolderName && (
                <p className="text-sm text-destructive">{errors.accountHolderName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number (Optional)</Label>
              <Input
                id="accountNumber"
                placeholder="e.g., 1234567890"
                {...register('accountNumber')}
              />
              {errors.accountNumber && (
                <p className="text-sm text-destructive">{errors.accountNumber.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Only the last 4 digits will be displayed for security
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID (Optional)</Label>
                <Input
                  id="upiId"
                  placeholder="e.g., name@upi"
                  {...register('upiId')}
                />
                {errors.upiId && (
                  <p className="text-sm text-destructive">{errors.upiId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code (Optional)</Label>
                <Input
                  id="ifscCode"
                  placeholder="e.g., HDFC0001234"
                  {...register('ifscCode')}
                />
                {errors.ifscCode && (
                  <p className="text-sm text-destructive">{errors.ifscCode.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance *</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('openingBalance', { valueAsNumber: true })}
              />
              {errors.openingBalance && (
                <p className="text-sm text-destructive">{errors.openingBalance.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter the current balance in your bank account
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={mutation.isPending}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
