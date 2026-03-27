'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Trash2, Receipt } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { updateTransactionSchema, type UpdateTransactionInput } from '@/lib/validations/transaction';
import { TransactionType, AccountType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ReceiptUploader } from '@/components/transactions/ReceiptUploader';
import { TagInput, COMMON_TAGS } from '@/components/shared/TagInput';
import { DuplicateWarning } from '@/components/transactions/DuplicateWarning';

interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  note?: string;
  dateTime: string;
  sourceType?: AccountType;
  sourceBankId?: string;
  sourceCardId?: string;
  destinationType?: AccountType;
  destinationBankId?: string;
  destinationCardId?: string;
  destinationInvestmentId?: string;
  categoryId?: string;
  memberId?: string;
  tripId?: string;
  goalId?: string;
  paymentMode?: string;
  referenceNumber?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  tags?: string[];
  createdAt: string;
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

interface BankAccount {
  _id: string;
  bankName: string;
  accountHolderName: string;
}

interface CardAccount {
  _id: string;
  cardName: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
}

interface Member {
  _id: string;
  name: string;
}

// Mongoose populate returns objects; extract the string _id or return the value as-is if already a string
function extractId(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && '_id' in val) {
    return String((val as Record<string, unknown>)._id);
  }
  return String(val);
}

async function fetchTransaction(id: string): Promise<Transaction> {
  const response = await fetch(`/api/transactions/${id}`);
  if (!response.ok) throw new Error('Failed to fetch transaction');
  const data = await response.json();
  return data.data;
}

async function fetchBankAccounts(): Promise<{ data: BankAccount[]; totalBalance: number }> {
  const response = await fetch('/api/accounts/banks');
  if (!response.ok) throw new Error('Failed to fetch bank accounts');
  return response.json();
}

async function fetchCards(): Promise<CardAccount[]> {
  const response = await fetch('/api/accounts/cards');
  if (!response.ok) throw new Error('Failed to fetch cards');
  const data = await response.json();
  return data.data;
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json();
  return data.data;
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members');
  if (!response.ok) throw new Error('Failed to fetch members');
  const data = await response.json();
  return data.data || [];
}

async function fetchUserTags(): Promise<string[]> {
  const response = await fetch('/api/transactions/tags');
  if (!response.ok) return [];
  const data = await response.json();
  return data.tags?.map((t: { tag: string }) => t.tag) || [];
}

async function fetchActiveTrips(): Promise<Trip[]> {
  const response = await fetch('/api/trips?status=planned,ongoing');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data ?? [];
}

async function fetchActiveGoals(): Promise<Goal[]> {
  const response = await fetch('/api/goals?status=active');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data ?? [];
}

async function updateTransaction(id: string, data: UpdateTransactionInput) {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update transaction');
  }

  return response.json();
}

async function deleteTransaction(id: string) {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete transaction');
  }

  return response.json();
}

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<string[]>([]);

  const { data: transaction, isLoading: transactionLoading } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => fetchTransaction(id),
  });

  // Initialize tags when transaction loads
  useEffect(() => {
    if (transaction?.tags) {
      setTags(transaction.tags);
    }
  }, [transaction?.tags]);

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: fetchBankAccounts,
  });
  const bankAccounts = bankAccountsData?.data ?? [];

  const { data: cardsData } = useQuery({
    queryKey: ['cards'],
    queryFn: fetchCards,
  });
  const cards = cardsData || [];

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });
  const categories = categoriesData || [];

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });
  const members = membersData || [];

  const { data: userTagsData } = useQuery({
    queryKey: ['user-tags'],
    queryFn: fetchUserTags,
  });

  const { data: activeTrips } = useQuery({
    queryKey: ['trips-active'],
    queryFn: fetchActiveTrips,
  });

  const { data: activeGoals } = useQuery({
    queryKey: ['goals-active'],
    queryFn: fetchActiveGoals,
  });
  const userTags = userTagsData || [];

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UpdateTransactionInput>({
    resolver: zodResolver(updateTransactionSchema),
    values: transaction ? {
      type: transaction.type,
      amount: transaction.amount,
      note: transaction.note || '',
      dateTime: new Date(transaction.dateTime),
      sourceType: transaction.sourceType,
      sourceBankId: extractId(transaction.sourceBankId),
      sourceCardId: extractId(transaction.sourceCardId),
      destinationType: transaction.destinationType,
      destinationBankId: extractId(transaction.destinationBankId),
      destinationCardId: extractId(transaction.destinationCardId),
      destinationInvestmentId: extractId(transaction.destinationInvestmentId),
      categoryId: extractId(transaction.categoryId),
      memberId: extractId(transaction.memberId),
      tripId: extractId(transaction.tripId),
      goalId: extractId(transaction.goalId),
      paymentMode: (transaction.paymentMode as UpdateTransactionInput['paymentMode']) || undefined,
      referenceNumber: transaction.referenceNumber || undefined,
    } : undefined,
  });

  const transactionType = watch('type');
  const watchSourceType = watch('sourceType');
  const watchDestinationType = watch('destinationType');
  const watchAmount = watch('amount');
  const watchDate = watch('dateTime');
  const watchCategoryId = watch('categoryId');
  const watchNote = watch('note');

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTransactionInput) => updateTransaction(id, { ...data, tags }),
    onSuccess: () => {
      toast.success('Transaction updated successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-active'] });
      router.push('/transactions');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTransaction(id),
    onSuccess: () => {
      toast.success('Transaction deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-active'] });
      router.push('/transactions');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: UpdateTransactionInput) => {
    updateMutation.mutate(data);
  };


  const filteredCategories = categories.filter((c) => 
    transactionType === TransactionType.TRANSFER_SELF ? false : c.type === transactionType
  );

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'income':
      case 'INCOME':
        return 'default';
      case 'expense':
      case 'EXPENSE':
        return 'destructive';
      case 'transfer':
      case 'TRANSFER_SELF':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (transactionLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Transaction Details</h1>
              {transaction && (
                <Badge variant={getTypeBadgeVariant(transaction.type)}>
                  {transaction.type === 'INCOME' ? 'Income' : transaction.type === 'EXPENSE' ? 'Expense' : 'Transfer'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              View and edit transaction
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone
                and will update account balances accordingly.
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

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Transaction</CardTitle>
          <CardDescription>
            {transaction && `Created on ${format(new Date(transaction.createdAt), 'PPP')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                      <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                      <SelectItem value={TransactionType.TRANSFER_SELF}>Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Description *</Label>
              <Input
                id="note"
                placeholder="e.g., Monthly salary"
                {...register('note')}
              />
              {errors.note && (
                <p className="text-sm text-destructive">{errors.note.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

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
                        {field.value ? format(field.value as Date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value as Date | undefined}
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

            {/* Source Account */}
            <div className="space-y-2">
              <Label>
                {transactionType === TransactionType.INCOME ? 'Deposit To' : 'Pay From'} *
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account._id} value={account._id}>
                              {account.bankName} - {account.accountHolderName}
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
                      <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent>
                          {cards.map((card) => (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {watchDestinationType === AccountType.BANK && (
                    <Controller
                      name="destinationBankId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((account) => (
                              <SelectItem key={account._id} value={account._id}>
                                {account.bankName} - {account.accountHolderName}
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
                        <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select card" />
                          </SelectTrigger>
                          <SelectContent>
                            {cards.map((card) => (
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
            )}

            {transactionType !== TransactionType.TRANSFER_SELF && (
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)} value={field.value || 'none'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredCategories.map((category) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="memberId">Family Member</Label>
              <Controller
                name="memberId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)} value={field.value || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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

            {/* Trip */}
            {activeTrips && activeTrips.length > 0 && (
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
                        {activeTrips.map((trip) => (
                          <SelectItem key={trip._id} value={trip._id}>
                            {trip.name} ({trip.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {/* Goal */}
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
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">Notes</Label>
              <Textarea
                id="note"
                placeholder="Add any additional notes..."
                {...register('note')}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                value={tags}
                onChange={setTags}
                suggestions={[...COMMON_TAGS, ...userTags].filter(
                  (tag, index, arr) => arr.indexOf(tag) === index
                )}
                placeholder="Add tags..."
                maxTags={10}
              />
              <p className="text-xs text-muted-foreground">
                Add tags to organize and filter transactions
              </p>
            </div>

            {/* Payment Mode + Reference Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Duplicate Warning (only when amount changes significantly) */}
            {watchAmount && watchAmount > 0 && watchDate && transaction && watchAmount !== transaction.amount && (
              <DuplicateWarning
                amount={watchAmount}
                dateTime={watchDate}
                categoryId={watchCategoryId || undefined}
                note={watchNote}
                excludeId={transaction._id}
              />
            )}

            {/* Receipt Upload Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Receipt / Attachment
              </Label>
              {transaction && (
                <ReceiptUploader
                  transactionId={transaction._id}
                  receiptUrl={transaction.receiptUrl}
                  receiptFileName={transaction.receiptFileName}
                />
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
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && (
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
