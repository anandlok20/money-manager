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
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER_SELF';
  amount: number;
  note?: string;
  dateTime: string;
  sourceType?: string;
  sourceBankId?: string;
  sourceCardId?: string;
  destinationType?: string;
  destinationBankId?: string;
  destinationCardId?: string;
  destinationInvestmentId?: string;
  categoryId?: string;
  memberId?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  tags?: string[];
  createdAt: string;
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

async function fetchTransaction(id: string): Promise<Transaction> {
  const response = await fetch(`/api/transactions/${id}`);
  if (!response.ok) throw new Error('Failed to fetch transaction');
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
  return data.data;
}

async function fetchUserTags(): Promise<string[]> {
  const response = await fetch('/api/transactions/tags');
  if (!response.ok) return [];
  const data = await response.json();
  return data.tags?.map((t: { tag: string }) => t.tag) || [];
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
  const bankAccounts = bankAccountsData || [];

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
  const userTags = userTagsData || [];

  // Helper to map API type to form type
  const mapTransactionType = (apiType: string): 'income' | 'expense' | 'transfer' => {
    switch (apiType) {
      case 'INCOME': return 'income';
      case 'EXPENSE': return 'expense';
      case 'TRANSFER_SELF': return 'transfer';
      default: return 'expense';
    }
  };

  // Get the source account ID from either bank or card
  const getSourceAccountId = (txn: Transaction): string => {
    return txn.sourceBankId || txn.sourceCardId || txn.destinationBankId || txn.destinationCardId || '';
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UpdateTransactionInput>({
    resolver: zodResolver(updateTransactionSchema),
    values: transaction ? {
      type: mapTransactionType(transaction.type),
      amount: transaction.amount,
      description: transaction.note || '',
      date: new Date(transaction.dateTime),
      sourceAccountId: getSourceAccountId(transaction),
      destinationAccountId: transaction.destinationBankId || transaction.destinationCardId,
      categoryId: transaction.categoryId,
      memberId: transaction.memberId,
      notes: transaction.note,
    } : undefined,
  });

  const transactionType = watch('type');
  const watchAmount = watch('amount');
  const watchDate = watch('date');
  const watchCategoryId = watch('categoryId');
  const watchNotes = watch('notes');

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTransactionInput) => updateTransaction(id, { ...data, tags }),
    onSuccess: () => {
      toast.success('Transaction updated successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
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
      router.push('/transactions');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: UpdateTransactionInput) => {
    updateMutation.mutate(data);
  };

  // Combine bank accounts and cards for source/destination selection
  const allAccounts = [
    ...bankAccounts.map((bank) => ({
      id: bank._id,
      name: `🏦 ${bank.bankName} - ${bank.accountHolderName}`,
      type: 'bank',
    })),
    ...cards.map((card) => ({
      id: card._id,
      name: `💳 ${card.cardName}`,
      type: 'card',
    })),
  ];

  const filteredCategories = categories.filter((c) => 
    transactionType === 'transfer' ? false : c.type === transactionType
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
                  {mapTransactionType(transaction.type).charAt(0).toUpperCase() + mapTransactionType(transaction.type).slice(1)}
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
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Monthly salary"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
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
                name="date"
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
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceAccountId">
                {transactionType === 'income' ? 'Deposit To' : 'From Account'} *
              </Label>
              <Controller
                name="sourceAccountId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {allAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.sourceAccountId && (
                <p className="text-sm text-destructive">{errors.sourceAccountId.message}</p>
              )}
            </div>

            {transactionType === 'transfer' && (
              <div className="space-y-2">
                <Label htmlFor="destinationAccountId">To Account *</Label>
                <Controller
                  name="destinationAccountId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                      <SelectContent>
                        {allAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.destinationAccountId && (
                  <p className="text-sm text-destructive">{errors.destinationAccountId.message}</p>
                )}
              </div>
            )}

            {transactionType !== 'transfer' && (
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                {...register('notes')}
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

            {/* Duplicate Warning (only when amount changes significantly) */}
            {watchAmount && watchAmount > 0 && watchDate && transaction && watchAmount !== transaction.amount && (
              <DuplicateWarning
                amount={watchAmount}
                dateTime={watchDate}
                categoryId={watchCategoryId || undefined}
                note={watchNotes}
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
