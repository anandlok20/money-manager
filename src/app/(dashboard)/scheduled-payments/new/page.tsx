'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';
import { Frequency, AccountType, TransactionType } from '@/types';
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
import { cn } from '@/lib/utils';

// Form schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  transactionType: z.nativeEnum(TransactionType),
  categoryId: z.string().optional(),
  frequency: z.nativeEnum(Frequency),
  startDate: z.date(),
  endDate: z.date().optional(),
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(500).optional(),
  memberId: z.string().optional(),
  sourceType: z.nativeEnum(AccountType),
  sourceBankId: z.string().optional(),
  sourceCardId: z.string().optional(),
  destinationType: z.nativeEnum(AccountType).optional(),
  destinationBankId: z.string().optional(),
  destinationCardId: z.string().optional(),
  destinationInvestmentId: z.string().optional(),
});

type FormInput = z.infer<typeof formSchema>;

interface BankAccount { _id: string; bankName: string; accountHolderName: string; }
interface CardAccount { _id: string; cardName: string; }
interface Member { _id: string; name: string; }
interface Investment { _id: string; name: string; type: string; }
interface Category { _id: string; name: string; type: string; }

async function fetchBankAccounts(): Promise<BankAccount[]> {
  const res = await fetch('/api/accounts/banks');
  if (!res.ok) throw new Error('Failed to fetch bank accounts');
  return (await res.json()).data;
}
async function fetchCards(): Promise<CardAccount[]> {
  const res = await fetch('/api/accounts/cards');
  if (!res.ok) throw new Error('Failed to fetch cards');
  return (await res.json()).data;
}
async function fetchMembers(): Promise<Member[]> {
  const res = await fetch('/api/members');
  if (!res.ok) throw new Error('Failed to fetch members');
  return (await res.json()).data;
}
async function fetchInvestments(): Promise<Investment[]> {
  const res = await fetch('/api/investments');
  if (!res.ok) throw new Error('Failed to fetch investments');
  return (await res.json()).data;
}
async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error('Failed to fetch categories');
  return (await res.json()).data;
}

async function createScheduledPayment(data: FormInput) {
  const res = await fetch('/api/scheduled-payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create scheduled payment');
  }
  return res.json();
}

const TX_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.EXPENSE]: 'Expense',
  [TransactionType.INCOME]: 'Income',
  [TransactionType.TRANSFER_SELF]: 'Transfer (Self)',
  [TransactionType.INVESTMENT_CONTRIBUTION]: 'Investment',
};

export default function NewScheduledPaymentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dateOpen, setDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const { data: bankAccounts = [] } = useQuery({ queryKey: ['bank-accounts'], queryFn: fetchBankAccounts });
  const { data: cards = [] } = useQuery({ queryKey: ['cards'], queryFn: fetchCards });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: fetchMembers });
  const { data: investments = [] } = useQuery({ queryKey: ['investments'], queryFn: fetchInvestments });
  const { data: allCategories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionType: TransactionType.EXPENSE,
      frequency: Frequency.MONTHLY,
      startDate: new Date(),
      sourceType: AccountType.BANK,
      destinationType: AccountType.BANK,
    },
  });

  const transactionType = watch('transactionType');
  const sourceType = watch('sourceType');
  const destinationType = watch('destinationType');
  const endDateValue = watch('endDate');

  const isExpenseOrIncome = transactionType === TransactionType.EXPENSE || transactionType === TransactionType.INCOME;
  const isTransfer = transactionType === TransactionType.TRANSFER_SELF || transactionType === TransactionType.INVESTMENT_CONTRIBUTION;

  const categories = allCategories.filter((c) =>
    transactionType === TransactionType.EXPENSE ? c.type === 'EXPENSE' : c.type === 'INCOME'
  );

  const mutation = useMutation({
    mutationFn: createScheduledPayment,
    onSuccess: () => {
      toast.success('Scheduled payment created');
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      router.push('/scheduled-payments');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: FormInput) => {
    // Strip destination fields for expense/income types
    if (isExpenseOrIncome) {
      delete data.destinationType;
      delete data.destinationBankId;
      delete data.destinationCardId;
      delete data.destinationInvestmentId;
    }
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/scheduled-payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Scheduled Payment</h1>
          <p className="text-muted-foreground">Set up a recurring payment or transfer</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Configure your recurring payment</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="e.g., Rent Payment, Netflix" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type *</Label>
              <Controller
                name="transactionType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TransactionType).map((t) => (
                        <SelectItem key={t} value={t}>{TX_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Category — only for Expense/Income */}
            {isExpenseOrIncome && (
              <div className="space-y-2">
                <Label>Category *</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
              </div>
            )}

            {/* Amount and Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Controller
                  name="frequency"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Frequency.DAILY}>Daily</SelectItem>
                        <SelectItem value={Frequency.WEEKLY}>Weekly</SelectItem>
                        <SelectItem value={Frequency.MONTHLY}>Monthly</SelectItem>
                        <SelectItem value={Frequency.QUARTERLY}>Quarterly</SelectItem>
                        <SelectItem value={Frequency.YEARLY}>Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Start Date and End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => { field.onChange(date); setDateOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP') : 'No end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => { field.onChange(date); setEndDateOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {endDateValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground px-0"
                    onClick={() => {
                      // Reset endDate to undefined via RHF
                    }}
                  >
                    Clear end date
                  </Button>
                )}
              </div>
            </div>

            {/* Source Account */}
            <div className="space-y-4">
              <h3 className="font-medium">Source Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <Controller
                    name="sourceType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AccountType.BANK}>Bank Account</SelectItem>
                          <SelectItem value={AccountType.CARD}>Card</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {sourceType === AccountType.BANK && (
                  <div className="space-y-2">
                    <Label>Bank Account *</Label>
                    <Controller
                      name="sourceBankId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
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
                )}

                {sourceType === AccountType.CARD && (
                  <div className="space-y-2">
                    <Label>Card *</Label>
                    <Controller
                      name="sourceCardId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                          <SelectContent>
                            {cards.map((card) => (
                              <SelectItem key={card._id} value={card._id}>{card.cardName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Destination Account — only for transfers */}
            {isTransfer && (
              <div className="space-y-4">
                <h3 className="font-medium">Destination Account</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Type *</Label>
                    <Controller
                      name="destinationType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {transactionType === TransactionType.INVESTMENT_CONTRIBUTION ? (
                              <SelectItem value={AccountType.INVESTMENT}>Investment</SelectItem>
                            ) : (
                              <>
                                <SelectItem value={AccountType.BANK}>Bank Account</SelectItem>
                                <SelectItem value={AccountType.CARD}>Card</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {destinationType === AccountType.BANK && (
                    <div className="space-y-2">
                      <Label>Bank Account *</Label>
                      <Controller
                        name="destinationBankId"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
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
                  )}

                  {destinationType === AccountType.CARD && (
                    <div className="space-y-2">
                      <Label>Card *</Label>
                      <Controller
                        name="destinationCardId"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                            <SelectContent>
                              {cards.map((card) => (
                                <SelectItem key={card._id} value={card._id}>{card.cardName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}

                  {destinationType === AccountType.INVESTMENT && (
                    <div className="space-y-2">
                      <Label>Investment *</Label>
                      <Controller
                        name="destinationInvestmentId"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select investment" /></SelectTrigger>
                            <SelectContent>
                              {investments.map((inv) => (
                                <SelectItem key={inv._id} value={inv._id}>{inv.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Member */}
            <div className="space-y-2">
              <Label>Member (Optional)</Label>
              <Controller
                name="memberId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)}
                    value={field.value || '__none__'}
                  >
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member._id} value={member._id}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea id="note" placeholder="e.g., Monthly SIP investment" {...register('note')} />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Scheduled Payment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
