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

interface Investment {
  _id: string;
  name: string;
  type: InvestmentType;
  currentValue: number;
}

async function fetchInvestment(id: string): Promise<Investment> {
  const response = await fetch(`/api/investments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch investment');
  const data = await response.json();
  return data.data;
}

async function updateInvestment(id: string, data: UpdateInvestmentInput) {
  const response = await fetch(`/api/investments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update investment');
  }

  return response.json();
}

const investmentTypes = [
  { value: InvestmentType.MUTUAL_FUND, label: 'Mutual Fund' },
  { value: InvestmentType.INSURANCE, label: 'Insurance' },
  { value: InvestmentType.SHARE_MARKET, label: 'Share Market' },
  { value: InvestmentType.OTHER, label: 'Other' },
];

export default function EditInvestmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: investment, isLoading } = useQuery({
    queryKey: ['investment', id],
    queryFn: () => fetchInvestment(id),
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateInvestmentInput>({
    resolver: zodResolver(updateInvestmentSchema),
    values: investment ? {
      name: investment.name,
      type: investment.type,
      currentValue: investment.currentValue,
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateInvestmentInput) => updateInvestment(id, data),
    onSuccess: () => {
      toast.success('Investment updated successfully');
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
      router.push('/investments');
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
        <Link href="/investments">
          <Button variant="ghost" size="icon" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Investment</h1>
          <p className="text-muted-foreground">
            Update investment details
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
          <CardDescription>
            Update your investment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Investment Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Reliance Industries"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Investment Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {investmentTypes.map((type) => (
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
              <Label htmlFor="currentValue">Current Value (₹) *</Label>
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
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
