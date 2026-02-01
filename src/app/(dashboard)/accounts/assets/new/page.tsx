'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { investmentSchema, type InvestmentInput } from '@/lib/validations/investment';
import { InvestmentType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

async function createAsset(data: InvestmentInput) {
  const response = await fetch('/api/investments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create asset');
  }

  return response.json();
}

export default function NewAssetPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InvestmentInput>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      type: InvestmentType.MUTUAL_FUND,
      currentValue: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      toast.success('Asset added successfully');
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      router.push('/accounts/assets');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: InvestmentInput) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/accounts/assets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Asset</h1>
          <p className="text-muted-foreground">
            Track a new asset or investment
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>
            Enter the details of your asset or investment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Asset Name *</Label>
              <Input
                id="name"
                placeholder="e.g., HDFC Equity Fund, Home in Mumbai"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Asset Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={InvestmentType.MUTUAL_FUND}>Mutual Fund</SelectItem>
                      <SelectItem value={InvestmentType.SHARE_MARKET}>Stocks / Shares</SelectItem>
                      <SelectItem value={InvestmentType.FIXED_DEPOSIT}>Fixed Deposit</SelectItem>
                      <SelectItem value={InvestmentType.PPF}>PPF</SelectItem>
                      <SelectItem value={InvestmentType.NPS}>NPS</SelectItem>
                      <SelectItem value={InvestmentType.INSURANCE}>Insurance</SelectItem>
                      <SelectItem value={InvestmentType.PROPERTY}>Property</SelectItem>
                      <SelectItem value={InvestmentType.VEHICLE}>Vehicle</SelectItem>
                      <SelectItem value={InvestmentType.GOLD_JEWELRY}>Gold & Jewelry</SelectItem>
                      <SelectItem value={InvestmentType.CRYPTO}>Cryptocurrency</SelectItem>
                      <SelectItem value={InvestmentType.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value *</Label>
              <Input
                id="currentValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('currentValue', { valueAsNumber: true })}
              />
              {errors.currentValue && (
                <p className="text-sm text-destructive">{errors.currentValue.message}</p>
              )}
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
                Add Asset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
