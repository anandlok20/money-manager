'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Eye, EyeOff, Bell } from 'lucide-react';
import Link from 'next/link';
import { updateCardSchema, type UpdateCardInput } from '@/lib/validations/account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CardAccount {
  _id: string;
  cardName: string;
  cardType?: string;
  cardNetwork?: string;
  cardNumber?: string;
  last4Digits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  pin?: string;
  billingCycleDay?: number;
  creditLimit?: number;
  spendingLimit?: number;
  spendingLimitAlert?: boolean;
  linkedBankId?: string;
  linkedMemberId?: string;
}

interface BankAccount {
  _id: string;
  bankName: string;
  accountHolderName: string;
}

interface Member {
  _id: string;
  name: string;
}

const cardTypes = [
  { value: 'CREDIT', label: 'Credit Card' },
  { value: 'DEBIT', label: 'Debit Card' },
  { value: 'PREPAID', label: 'Prepaid Card' },
  { value: 'FOREX', label: 'Forex Card' },
  { value: 'VIRTUAL', label: 'Virtual Card' },
];

const cardNetworks = [
  { value: 'VISA', label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'RUPAY', label: 'RuPay' },
  { value: 'AMEX', label: 'American Express' },
  { value: 'DINERS', label: 'Diners Club' },
  { value: 'DISCOVER', label: 'Discover' },
  { value: 'OTHER', label: 'Other' },
];

async function fetchCard(id: string): Promise<CardAccount> {
  const response = await fetch(`/api/accounts/cards/${id}`);
  if (!response.ok) throw new Error('Failed to fetch card');
  const data = await response.json();
  return data.data;
}

async function fetchBankAccounts(): Promise<BankAccount[]> {
  const response = await fetch('/api/accounts/banks');
  if (!response.ok) throw new Error('Failed to fetch bank accounts');
  const data = await response.json();
  return data.data;
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members');
  if (!response.ok) throw new Error('Failed to fetch members');
  const data = await response.json();
  return data.data;
}

async function updateCard(id: string, data: UpdateCardInput) {
  const response = await fetch(`/api/accounts/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update card');
  }

  return response.json();
}

export default function EditCardPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const { data: card, isLoading: cardLoading } = useQuery({
    queryKey: ['card', id],
    queryFn: () => fetchCard(id),
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: fetchBankAccounts,
  });
  const bankAccounts = bankAccountsData || [];

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });
  const members = membersData || [];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<UpdateCardInput>({
    resolver: zodResolver(updateCardSchema) as any,
    values: card ? {
      cardName: card.cardName,
      cardType: card.cardType as UpdateCardInput['cardType'],
      cardNetwork: card.cardNetwork as UpdateCardInput['cardNetwork'],
      cardNumber: card.cardNumber,
      last4Digits: card.last4Digits,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cvv: card.cvv,
      pin: card.pin,
      billingCycleDay: card.billingCycleDay,
      creditLimit: card.creditLimit,
      spendingLimit: card.spendingLimit ?? 0,
      spendingLimitAlert: card.spendingLimitAlert ?? true,
      linkedBankId: card.linkedBankId,
      linkedMemberId: card.linkedMemberId,
    } : undefined,
  });

  const cardType = watch('cardType');
  const spendingLimitAlert = watch('spendingLimitAlert');

  const mutation = useMutation({
    mutationFn: (data: UpdateCardInput) => updateCard(id, data),
    onSuccess: () => {
      toast.success('Card updated successfully');
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      router.push('/accounts/cards');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: UpdateCardInput) => {
    // Extract last 4 digits from card number if provided
    if (data.cardNumber && !data.last4Digits) {
      data.last4Digits = data.cardNumber.replace(/\s/g, '').slice(-4);
    }
    // Clean empty strings from optional fields
    if (data.cvv === '') delete (data as Record<string, unknown>).cvv;
    if (data.pin === '') delete (data as Record<string, unknown>).pin;
    if (data.cardNumber === '') delete (data as Record<string, unknown>).cardNumber;
    mutation.mutate(data);
  };

  if (cardLoading) {
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
        <Link href="/accounts/cards">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Card</h1>
          <p className="text-muted-foreground">
            Update your card details
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Card Details</CardTitle>
          <CardDescription>
            Update your card information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardName">Card Name *</Label>
              <Input
                id="cardName"
                placeholder="e.g., HDFC Regalia Credit Card"
                {...register('cardName')}
              />
              {errors.cardName && (
                <p className="text-sm text-destructive">{errors.cardName.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cardType">Card Type</Label>
                <Controller
                  name="cardType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {cardTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNetwork">Card Network</Label>
                <Controller
                  name="cardNetwork"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {cardNetworks.map((network) => (
                          <SelectItem key={network.value} value={network.value}>
                            {network.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                {...register('cardNumber')}
              />
              {errors.cardNumber && (
                <p className="text-sm text-destructive">{errors.cardNumber.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <Controller
                  name="expiryMonth"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} 
                      value={field.value?.toString() || ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {month.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <Controller
                  name="expiryYear"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} 
                      value={field.value?.toString() || ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <div className="relative">
                  <Input
                    id="cvv"
                    type={showCvv ? 'text' : 'password'}
                    placeholder="***"
                    maxLength={4}
                    {...register('cvv')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowCvv(!showCvv)}
                  >
                    {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pin">ATM PIN</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    placeholder="****"
                    maxLength={6}
                    {...register('pin')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingCycleDay">Billing Cycle Day</Label>
                <Input
                  id="billingCycleDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g., 15"
                  {...register('billingCycleDay', { valueAsNumber: true })}
                />
              </div>
            </div>

            {cardType === 'CREDIT' && (
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Credit Limit</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 100000"
                  {...register('creditLimit', { valueAsNumber: true })}
                />
              </div>
            )}

            {/* Spending Limit Alert Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="spendingLimitAlert" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Spending Limit Alert
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when spending exceeds limit
                  </p>
                </div>
                <Switch
                  id="spendingLimitAlert"
                  checked={spendingLimitAlert}
                  onCheckedChange={(checked) => setValue('spendingLimitAlert', checked)}
                />
              </div>
              
              {spendingLimitAlert && (
                <div className="space-y-2">
                  <Label htmlFor="spendingLimit">Monthly Spending Limit</Label>
                  <Input
                    id="spendingLimit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('spendingLimit', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll be alerted when your monthly spending exceeds this amount
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedBankId">Linked Bank Account</Label>
              <Controller
                name="linkedBankId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((bank) => (
                        <SelectItem key={bank._id} value={bank._id}>
                          {bank.bankName} - {bank.accountHolderName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedMemberId">Linked Member</Label>
              <Controller
                name="linkedMemberId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member._id} value={member._id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
