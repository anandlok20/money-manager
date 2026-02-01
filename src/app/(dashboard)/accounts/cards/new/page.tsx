'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { cardSchema, type CardInput } from '@/lib/validations/account';
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

interface BankAccount {
  _id: string;
  bankName: string;
  accountHolderName: string;
  displayName: string;
}

interface Member {
  _id: string;
  name: string;
  type: string;
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

async function createCard(data: CardInput) {
  const response = await fetch('/api/accounts/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create card');
  }

  return response.json();
}

export default function NewCardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);

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
    formState: { errors },
  } = useForm<CardInput>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardName: '',
      cardType: 'CREDIT',
    },
  });

  const cardType = watch('cardType');

  const mutation = useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      toast.success('Card added successfully');
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      router.push('/accounts/cards');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: CardInput) => {
    const cardData = { ...data };
    // Extract last 4 digits from card number if provided
    if (cardData.cardNumber && !cardData.last4Digits) {
      cardData.last4Digits = cardData.cardNumber.replace(/\s/g, '').slice(-4);
    }
    // Clean empty strings from optional fields
    if (cardData.cvv === '') cardData.cvv = undefined;
    if (cardData.pin === '') cardData.pin = undefined;
    if (cardData.cardNumber === '') cardData.cardNumber = undefined;
    mutation.mutate(cardData);
  };

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
          <h1 className="text-2xl font-bold">Add Card</h1>
          <p className="text-muted-foreground">
            Add a credit, debit, or prepaid card to track expenses
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Card Details</CardTitle>
          <CardDescription>
            Enter your card information. Sensitive data will be securely stored.
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
                <Label htmlFor="cardType">Card Type *</Label>
                <Controller
                  name="cardType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
              <Label htmlFor="cardNumber">Card Number (Optional)</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                {...register('cardNumber')}
              />
              {errors.cardNumber && (
                <p className="text-sm text-destructive">{errors.cardNumber.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Stored securely. Last 4 digits will be auto-extracted.
              </p>
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
                      value={field.value?.toString()}
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
                      value={field.value?.toString()}
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
                {errors.cvv && (
                  <p className="text-sm text-destructive">{errors.cvv.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pin">ATM PIN (Optional)</Label>
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
                {errors.pin && (
                  <p className="text-sm text-destructive">{errors.pin.message}</p>
                )}
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
                {errors.billingCycleDay && (
                  <p className="text-sm text-destructive">{errors.billingCycleDay.message}</p>
                )}
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
                {errors.creditLimit && (
                  <p className="text-sm text-destructive">{errors.creditLimit.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="linkedBankId">Linked Bank Account (Optional)</Label>
              <Controller
                name="linkedBankId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
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
              <p className="text-xs text-muted-foreground">
                Link to a bank account for payment tracking
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedMemberId">Linked Member (Optional)</Label>
              <Controller
                name="linkedMemberId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
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
                Add Card
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
