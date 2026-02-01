'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { updateInvestmentSchema, type UpdateInvestmentInput } from '@/lib/validations/investment';
import { InvestmentType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Asset {
  _id: string;
  name: string;
  type: InvestmentType;
  currentValue: number;
}

async function fetchAsset(id: string): Promise<Asset> {
  const response = await fetch(`/api/investments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch asset');
  const data = await response.json();
  return data.data;
}

async function updateAsset(id: string, data: UpdateInvestmentInput) {
  const response = await fetch(`/api/investments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update asset');
  }

  return response.json();
}

const assetTypes = [
  { value: InvestmentType.MUTUAL_FUND, label: 'Mutual Fund' },
  { value: InvestmentType.SHARE_MARKET, label: 'Stocks / Shares' },
  { value: InvestmentType.FIXED_DEPOSIT, label: 'Fixed Deposit' },
  { value: InvestmentType.PPF, label: 'PPF' },
  { value: InvestmentType.NPS, label: 'NPS' },
  { value: InvestmentType.INSURANCE, label: 'Insurance' },
  { value: InvestmentType.PROPERTY, label: 'Property' },
  { value: InvestmentType.VEHICLE, label: 'Vehicle' },
  { value: InvestmentType.GOLD_JEWELRY, label: 'Gold & Jewelry' },
  { value: InvestmentType.CRYPTO, label: 'Cryptocurrency' },
  { value: InvestmentType.OTHER, label: 'Other' },
];

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: asset, isLoading } = useQuery({
    queryKey: ['investment', id],
    queryFn: () => fetchAsset(id),
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateInvestmentInput>({
    resolver: zodResolver(updateInvestmentSchema),
    values: asset ? {
      name: asset.name,
      type: asset.type,
      currentValue: asset.currentValue,
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateInvestmentInput) => updateAsset(id, data),
    onSuccess: () => {
      toast.success('Asset updated successfully');
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
      router.push('/accounts/assets');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: UpdateInvestmentInput) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">Edit Asset</h1>
          <p className="text-muted-foreground">
            Update asset details
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>
            Update your asset or investment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Asset Name *</Label>
              <Input
                id="name"
                placeholder="e.g., HDFC Equity Fund"
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
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
                Update Asset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
