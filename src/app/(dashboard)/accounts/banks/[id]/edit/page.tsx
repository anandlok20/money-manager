'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Bell, Lock } from 'lucide-react';
import Link from 'next/link';
import { updateBankAccountSchema, type UpdateBankAccountInput } from '@/lib/validations/account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

interface BankAccount {
  _id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  upiId?: string;
  ifscCode?: string;
  openingBalance: number;
  currentBalance: number;
  minimumBalance?: number;
  minimumBalanceAlert?: boolean;
  isPrivate?: boolean;
}

async function fetchBankAccount(id: string): Promise<BankAccount> {
  const response = await fetch(`/api/accounts/banks/${id}`);
  if (!response.ok) throw new Error('Failed to fetch bank account');
  const data = await response.json();
  return data.data;
}

async function updateBankAccount(id: string, data: UpdateBankAccountInput) {
  const response = await fetch(`/api/accounts/banks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update bank account');
  }

  return response.json();
}

export default function EditBankAccountPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: account, isLoading } = useQuery({
    queryKey: ['bank-account', id],
    queryFn: () => fetchBankAccount(id),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateBankAccountInput>({
    resolver: zodResolver(updateBankAccountSchema),
    values: account ? {
      bankName: account.bankName,
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      upiId: account.upiId,
      ifscCode: account.ifscCode,
      openingBalance: account.openingBalance,
      minimumBalance: account.minimumBalance ?? 0,
      minimumBalanceAlert: account.minimumBalanceAlert ?? true,
      isPrivate: account.isPrivate ?? false,
    } : undefined,
  });

  const minimumBalanceAlert = watch('minimumBalanceAlert');
  const isPrivate = watch('isPrivate');

  const mutation = useMutation({
    mutationFn: (data: UpdateBankAccountInput) => updateBankAccount(id, data),
    onSuccess: () => {
      toast.success('Bank account updated successfully');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-account', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      router.push('/accounts/banks');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: UpdateBankAccountInput) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/accounts/banks">
          <Button variant="ghost" size="icon" aria-label="Go back to bank accounts">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Bank Account</h1>
          <p className="text-muted-foreground">
            Update your bank account details
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            Update the details of your bank account
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
              <Label htmlFor="openingBalance">Opening Balance</Label>
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
            </div>

            {/* Minimum Balance Alert Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="minimumBalanceAlert" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Low Balance Alert
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when balance falls below minimum
                  </p>
                </div>
                <Switch
                  id="minimumBalanceAlert"
                  checked={minimumBalanceAlert}
                  onCheckedChange={(checked) => setValue('minimumBalanceAlert', checked)}
                />
              </div>
              
              {minimumBalanceAlert && (
                <div className="space-y-2">
                  <Label htmlFor="minimumBalance">Minimum Balance Threshold</Label>
                  <Input
                    id="minimumBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('minimumBalance', { valueAsNumber: true })}
                  />
                  {errors.minimumBalance && (
                    <p className="text-sm text-destructive">{errors.minimumBalance.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll be alerted when your balance goes below this amount
                  </p>
                </div>
              )}
            </div>

            {/* Private toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Private</p>
                  <p className="text-xs text-muted-foreground">Only visible to you</p>
                </div>
              </div>
              <Switch
                checked={!!isPrivate}
                onCheckedChange={(checked) => setValue('isPrivate', checked)}
              />
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
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
