'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';
import { Frequency, AccountType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Form schema for update
const formSchema = z.object({
  frequency: z.nativeEnum(Frequency).optional(),
  startDate: z.date().optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  note: z.string().max(500).optional(),
  memberId: z.string().optional(),
  sourceType: z.nativeEnum(AccountType).optional(),
  sourceBankId: z.string().optional(),
  sourceCardId: z.string().optional(),
  destinationType: z.nativeEnum(AccountType).optional(),
  destinationBankId: z.string().optional(),
  destinationCardId: z.string().optional(),
  destinationInvestmentId: z.string().optional(),
  isActive: z.boolean().optional(),
});

type FormInput = z.infer<typeof formSchema>;

interface ScheduledPayment {
  _id: string;
  amount: number;
  frequency: Frequency;
  startDate: string;
  nextRunDate: string;
  lastRunDate?: string;
  note?: string;
  memberId?: string;
  sourceType: AccountType;
  sourceBankId?: string;
  sourceCardId?: string;
  destinationType: AccountType;
  destinationBankId?: string;
  destinationCardId?: string;
  destinationInvestmentId?: string;
  isActive: boolean;
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

interface Member {
  _id: string;
  name: string;
}

interface Investment {
  _id: string;
  name: string;
  type: string;
}

async function fetchScheduledPayment(id: string): Promise<ScheduledPayment> {
  const response = await fetch(`/api/scheduled-payments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch scheduled payment');
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

async function updateScheduledPayment(id: string, data: FormInput) {
  const response = await fetch(`/api/scheduled-payments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update scheduled payment');
  }

  return response.json();
}

export default function EditScheduledPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [dateOpen, setDateOpen] = useState(false);

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ['scheduled-payment', id],
    queryFn: () => fetchScheduledPayment(id),
  });

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

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });
  const members = membersData || [];

  const { data: investmentsData } = useQuery({
    queryKey: ['investments'],
    queryFn: fetchInvestments,
  });
  const investments = investmentsData || [];

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    values: payment ? {
      frequency: payment.frequency,
      startDate: new Date(payment.startDate),
      amount: payment.amount,
      note: payment.note,
      memberId: payment.memberId,
      sourceType: payment.sourceType,
      sourceBankId: payment.sourceBankId,
      sourceCardId: payment.sourceCardId,
      destinationType: payment.destinationType,
      destinationBankId: payment.destinationBankId,
      destinationCardId: payment.destinationCardId,
      destinationInvestmentId: payment.destinationInvestmentId,
      isActive: payment.isActive,
    } : undefined,
  });

  const sourceType = watch('sourceType');
  const destinationType = watch('destinationType');

  const mutation = useMutation({
    mutationFn: (data: FormInput) => updateScheduledPayment(id, data),
    onSuccess: () => {
      toast.success('Scheduled payment updated');
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-payment', id] });
      router.push('/scheduled-payments');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: FormInput) => {
    mutation.mutate(data);
  };

  if (paymentLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Scheduled payment not found</p>
          <Link href="/scheduled-payments">
            <Button className="mt-4">Back to Scheduled Payments</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/scheduled-payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Scheduled Payment</h1>
          <p className="text-muted-foreground">
            Update recurring payment details
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Modify the scheduled payment configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable this scheduled payment
                </p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Amount and Frequency */}
            <div className="grid grid-cols-2 gap-4">
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
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Controller
                  name="frequency"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
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

            {/* Start Date */}
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
                        onSelect={(date) => {
                          field.onChange(date);
                          setDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            {/* Source Account */}
            <div className="space-y-4">
              <h3 className="font-medium">Source Account</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <Controller
                    name="sourceType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
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
                )}

                {sourceType === AccountType.CARD && (
                  <div className="space-y-2">
                    <Label>Card *</Label>
                    <Controller
                      name="sourceCardId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
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
                  </div>
                )}
              </div>
            </div>

            {/* Destination Account */}
            <div className="space-y-4">
              <h3 className="font-medium">Destination Account</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <Controller
                    name="destinationType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AccountType.BANK}>Bank Account</SelectItem>
                          <SelectItem value={AccountType.CARD}>Card</SelectItem>
                          <SelectItem value={AccountType.INVESTMENT}>Investment</SelectItem>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
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
                )}

                {destinationType === AccountType.CARD && (
                  <div className="space-y-2">
                    <Label>Card *</Label>
                    <Controller
                      name="destinationCardId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Select investment" />
                          </SelectTrigger>
                          <SelectContent>
                            {investments.map((inv) => (
                              <SelectItem key={inv._id} value={inv._id}>
                                {inv.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Member */}
            <div className="space-y-2">
              <Label>Member (Optional)</Label>
              <Controller
                name="memberId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="e.g., Monthly SIP investment"
                {...register('note')}
              />
            </div>

            {/* Actions */}
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
