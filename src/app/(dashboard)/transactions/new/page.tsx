'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { transactionSchema, type TransactionInput } from '@/lib/validations/transaction';
import { TransactionType, AccountType, CategoryType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TagInput, COMMON_TAGS } from '@/components/shared/TagInput';
import { DuplicateWarning } from '@/components/transactions/DuplicateWarning';
import { Skeleton } from '@/components/ui/skeleton';

interface Category {
  _id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

interface BankAccount {
  _id: string;
  bankName: string;
  accountHolderName: string;
  displayName: string;
}

interface CardAccount {
  _id: string;
  cardName: string;
}

interface Member {
  _id: string;
  name: string;
  type: string;
}

interface Investment {
  _id: string;
  name: string;
  type: string;
}

interface Trip {
  _id: string;
  name: string;
  status: string;
}

interface Goal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

async function fetchCategories(type: CategoryType): Promise<Category[]> {
  const response = await fetch(`/api/categories?type=${type}`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json();
  return data.data;
}

async function fetchBankAccounts(): Promise<BankAccount[]> {
  const response = await fetch('/api/accounts/banks');
  if (!response.ok) throw new Error('Failed to fetch bank accounts');
  const data = await response.json();
  return data.data;
}

async function fetchCards(): Promise<CardAccount[]> {
  const response = await fetch('/api/accounts/cards');
  if (!response.ok) throw new Error('Failed to fetch cards');
  const data = await response.json();
  return data.data;
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members');
  if (!response.ok) throw new Error('Failed to fetch members');
  const data = await response.json();
  return data.data;
}

async function fetchInvestments(): Promise<Investment[]> {
  const response = await fetch('/api/investments');
  if (!response.ok) throw new Error('Failed to fetch investments');
  const data = await response.json();
  return data.data;
}

async function fetchTrips(): Promise<Trip[]> {
  const response = await fetch('/api/trips?status=planned,ongoing');
  if (!response.ok) throw new Error('Failed to fetch trips');
  const data = await response.json();
  return data.data;
}

async function fetchGoals(): Promise<Goal[]> {
  const response = await fetch('/api/goals?status=active');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data ?? [];
}

async function fetchUserTags(): Promise<string[]> {
  const response = await fetch('/api/transactions/tags');
  if (!response.ok) return [];
  const data = await response.json();
  return data.tags?.map((t: { tag: string }) => t.tag) || [];
}

async function createTransaction(data: TransactionInput) {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create transaction');
  }

  return response.json();
}

function NewTransactionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [transactionType, setTransactionType] = useState<TransactionType>(
    TransactionType.EXPENSE
  );
  const [tags, setTags] = useState<string[]>([]);
  
  // Get tripId from URL params
  const initialTripId = searchParams.get('tripId');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: TransactionType.EXPENSE,
      dateTime: new Date(),
      amount: 0,
      sourceType: AccountType.BANK,
      tags: [],
      tripId: initialTripId || undefined,
      goalId: undefined,
    },
  });

  // Set tripId from URL params on mount
  useEffect(() => {
    if (initialTripId) {
      setValue('tripId', initialTripId);
    }
  }, [initialTripId, setValue]);

  const watchSourceType = watch('sourceType');
  const watchDestinationType = watch('destinationType');
  const watchAmount = watch('amount');
  const watchDateTime = watch('dateTime');
  const watchCategoryId = watch('categoryId');
  const watchNote = watch('note');

  // Queries
  const { data: incomeCategories } = useQuery({
    queryKey: ['categories', CategoryType.INCOME],
    queryFn: () => fetchCategories(CategoryType.INCOME),
  });

  const { data: expenseCategories } = useQuery({
    queryKey: ['categories', CategoryType.EXPENSE],
    queryFn: () => fetchCategories(CategoryType.EXPENSE),
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts-simple'],
    queryFn: fetchBankAccounts,
  });

  const { data: cards } = useQuery({
    queryKey: ['cards-simple'],
    queryFn: fetchCards,
  });

  const { data: members } = useQuery({
    queryKey: ['members-simple'],
    queryFn: fetchMembers,
  });

  const { data: investments } = useQuery({
    queryKey: ['investments-simple'],
    queryFn: fetchInvestments,
    enabled: transactionType === TransactionType.INVESTMENT_CONTRIBUTION || 
             (transactionType === TransactionType.TRANSFER_SELF && watchDestinationType === AccountType.INVESTMENT),
  });

  const { data: trips } = useQuery({
    queryKey: ['trips-active'],
    queryFn: fetchTrips,
    enabled: transactionType === TransactionType.EXPENSE || transactionType === TransactionType.INCOME,
  });

  const { data: activeGoals } = useQuery({
    queryKey: ['goals-active'],
    queryFn: fetchGoals,
  });

  const { data: userTags } = useQuery({
    queryKey: ['user-tags'],
    queryFn: fetchUserTags,
  });

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      toast.success('Transaction created successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-active'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      
      // Navigate back to trip if coming from trip page
      if (initialTripId) {
        router.push(`/trips/${initialTripId}`);
      } else {
        router.push('/transactions');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: TransactionInput) => {
    mutation.mutate({
      ...data,
      type: transactionType,
      tags,
    });
  };

  const handleTypeChange = (type: string) => {
    const newType = type as TransactionType;
    setTransactionType(newType);
    setValue('type', newType);

    // Reset category when switching between income and expense
    setValue('categoryId', undefined);

    // Set default values based on type
    if (newType === TransactionType.TRANSFER_SELF) {
      setValue('destinationType', AccountType.BANK);
    } else if (newType === TransactionType.INVESTMENT_CONTRIBUTION) {
      setValue('destinationType', AccountType.INVESTMENT);
    }
  };

  const categories =
    transactionType === TransactionType.INCOME
      ? incomeCategories
      : expenseCategories;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Transaction</h1>
          <p className="text-muted-foreground">Record a new transaction</p>
        </div>
      </div>

      {/* Transaction Type Tabs */}
      <Tabs value={transactionType} onValueChange={handleTypeChange}>
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-4">
            <TabsTrigger value={TransactionType.EXPENSE} className="flex-shrink-0 px-4">Expense</TabsTrigger>
            <TabsTrigger value={TransactionType.INCOME} className="flex-shrink-0 px-4">Income</TabsTrigger>
            <TabsTrigger value={TransactionType.TRANSFER_SELF} className="flex-shrink-0 px-4">Transfer</TabsTrigger>
            <TabsTrigger value={TransactionType.INVESTMENT_CONTRIBUTION} className="flex-shrink-0 px-4">Invest</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Fill in the details of your transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="text-2xl h-14"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Controller
                name="dateTime"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.dateTime && (
                <p className="text-sm text-destructive">{errors.dateTime.message}</p>
              )}
            </div>

            {/* Category (for Income/Expense) */}
            {(transactionType === TransactionType.INCOME ||
              transactionType === TransactionType.EXPENSE) && (
              <div className="space-y-2">
                <Label>Category *</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && (
                  <p className="text-sm text-destructive">Category is required</p>
                )}
              </div>
            )}

            {/* Member */}
            <div className="space-y-2">
              <Label>Member</Label>
              <Controller
                name="memberId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((member) => (
                        <SelectItem key={member._id} value={member._id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Source Account */}
            <div className="space-y-2">
              <Label>
                {transactionType === TransactionType.INCOME
                  ? 'Deposit To'
                  : 'Pay From'}{' '}
                *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Controller
                  name="sourceType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Account Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AccountType.BANK}>Bank</SelectItem>
                        <SelectItem value={AccountType.CARD}>Card</SelectItem>
                        <SelectItem value={AccountType.CASH}>Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />

                {watchSourceType === AccountType.BANK && (
                  <Controller
                    name="sourceBankId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts?.map((account) => (
                            <SelectItem key={account._id} value={account._id}>
                              {account.displayName || account.bankName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}

                {watchSourceType === AccountType.CARD && (
                  <Controller
                    name="sourceCardId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent>
                          {cards?.map((card) => (
                            <SelectItem key={card._id} value={card._id}>
                              {card.cardName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Destination Account (for Transfer) */}
            {transactionType === TransactionType.TRANSFER_SELF && (
              <div className="space-y-2">
                <Label>Transfer To *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    name="destinationType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Account Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AccountType.BANK}>Bank</SelectItem>
                          <SelectItem value={AccountType.CARD}>Card</SelectItem>
                          <SelectItem value={AccountType.INVESTMENT}>
                            Investment
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />

                  {watchDestinationType === AccountType.BANK && (
                    <Controller
                      name="destinationBankId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts?.map((account) => (
                              <SelectItem key={account._id} value={account._id}>
                                {account.displayName || account.bankName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}

                  {watchDestinationType === AccountType.CARD && (
                    <Controller
                      name="destinationCardId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select card" />
                          </SelectTrigger>
                          <SelectContent>
                            {cards?.map((card) => (
                              <SelectItem key={card._id} value={card._id}>
                                {card.cardName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}

                  {watchDestinationType === AccountType.INVESTMENT && (
                    <Controller
                      name="destinationInvestmentId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select investment" />
                          </SelectTrigger>
                          <SelectContent>
                            {investments?.map((inv) => (
                              <SelectItem key={inv._id} value={inv._id}>
                                {inv.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Investment Destination (for Investment Contribution) */}
            {transactionType === TransactionType.INVESTMENT_CONTRIBUTION && (
              <div className="space-y-2">
                <Label>Invest In *</Label>
                <Controller
                  name="destinationInvestmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select investment" />
                      </SelectTrigger>
                      <SelectContent>
                        {investments?.map((inv) => (
                          <SelectItem key={inv._id} value={inv._id}>
                            {inv.name} ({inv.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {/* Trip (for expense/income) */}
            {(transactionType === TransactionType.EXPENSE || transactionType === TransactionType.INCOME) && trips && trips.length > 0 && (
              <div className="space-y-2">
                <Label>Trip (Optional)</Label>
                <Controller
                  name="tripId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tag to a trip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Trip</SelectItem>
                        {trips.map((trip) => (
                          <SelectItem key={trip._id} value={trip._id}>
                            {trip.name} ({trip.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Tag this transaction to track trip expenses
                </p>
              </div>
            )}

            {/* Goal (optional — track progress towards a savings goal) */}
            {activeGoals && activeGoals.length > 0 && (
              <div className="space-y-2">
                <Label>Track Goal Progress (Optional)</Label>
                <Controller
                  name="goalId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Link to a goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Goal</SelectItem>
                        {activeGoals.map((goal) => {
                          const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                          return (
                            <SelectItem key={goal._id} value={goal._id}>
                              {goal.name} ({pct}% of ₹{goal.targetAmount.toLocaleString()})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  This transaction amount will be added to the goal&apos;s progress
                </p>
              </div>
            )}

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note..."
                {...register('note')}
              />
            </div>

            {/* Payment Mode + Reference Number */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode (Optional)</Label>
                <Controller
                  name="paymentMode"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How was it paid?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="neft">NEFT</SelectItem>
                        <SelectItem value="rtgs">RTGS</SelectItem>
                        <SelectItem value="imps">IMPS</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="card">Card (Swipe)</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Reference No. (Optional)</Label>
                <Input
                  id="referenceNumber"
                  placeholder="UPI ref, UTR, cheque no..."
                  {...register('referenceNumber')}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <TagInput
                value={tags}
                onChange={setTags}
                suggestions={[...COMMON_TAGS, ...(userTags || [])].filter(
                  (tag, index, arr) => arr.indexOf(tag) === index
                )}
                placeholder="Add tags..."
                maxTags={10}
              />
              <p className="text-xs text-muted-foreground">
                Add tags to organize and filter transactions
              </p>
            </div>

            {/* Duplicate Warning */}
            {watchAmount > 0 && watchDateTime && (
              <DuplicateWarning
                amount={watchAmount}
                dateTime={watchDateTime}
                categoryId={watchCategoryId}
                note={watchNote}
                onCancel={() => router.back()}
              />
            )}

            {/* Submit */}
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
                Save Transaction
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4 max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    }>
      <NewTransactionContent />
    </Suspense>
  );
}
