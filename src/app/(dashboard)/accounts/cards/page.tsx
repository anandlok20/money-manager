'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CreditCard, Plus, MoreVertical, Edit, Trash2, Copy, Check, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';
import { SensitivePasswordDialog, SetSensitivePasswordDialog, useSensitiveDataAccess } from '@/components/shared/SensitiveDataPassword';

interface CardAccount {
  _id: string;
  cardName: string;
  cardType?: 'CREDIT' | 'DEBIT' | 'PREPAID' | 'FOREX' | 'VIRTUAL';
  cardNetwork?: string;
  cardNumber?: string;
  last4Digits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  pin?: string;
  billingCycleDay?: number;
  creditLimit?: number;
  currentBalance: number;
  linkedBankId?: {
    bankName: string;
    accountHolderName: string;
  };
  linkedMemberId?: {
    name: string;
  };
  isActive: boolean;
}

const cardTypeColors: Record<string, string> = {
  CREDIT: 'from-purple-500 to-pink-500',
  DEBIT: 'from-blue-500 to-cyan-500',
  PREPAID: 'from-green-500 to-emerald-500',
  FOREX: 'from-orange-500 to-amber-500',
  VIRTUAL: 'from-gray-500 to-slate-500',
};

const cardTypeBadgeColors: Record<string, string> = {
  CREDIT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  DEBIT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PREPAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  FOREX: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  VIRTUAL: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

async function fetchCards(): Promise<{ data: CardAccount[]; totalBalance: number }> {
  const response = await fetch('/api/accounts/cards');
  if (!response.ok) throw new Error('Failed to fetch cards');
  const data = await response.json();
  return { data: data.data, totalBalance: data.totalBalance };
}

async function deleteCard(id: string) {
  const response = await fetch(`/api/accounts/cards/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete card');
  }
  return response.json();
}

export default function CardsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, Record<string, boolean>>>({});
  const { isPasswordSet, hasAccess, grantAccess, revokeAccess, expiresAt } = useSensitiveDataAccess();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cards'],
    queryFn: fetchCards,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      toast.success('Card deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const toggleVisibility = (cardId: string, field: string) => {
    if (!hasAccess) {
      toast.error('Please unlock sensitive data first');
      return;
    }
    setVisibleSecrets(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        [field]: !prev[cardId]?.[field],
      },
    }));
  };

  const maskCardNumber = (number?: string) => {
    if (!number) return null;
    const clean = number.replace(/\s/g, '');
    return `**** **** **** ${clean.slice(-4)}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load cards</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cards</h1>
          <p className="text-muted-foreground">
            Manage your credit and debit cards
          </p>
        </div>
        <Link href="/accounts/cards/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        </Link>
      </div>

      {/* Total Balance Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Card Balance (Outstanding)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 dark:text-red-400 truncate">
              {formatCurrency(data?.totalBalance || 0, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sensitive Data Access Banner */}
      {data?.data.some(card => card.cvv || card.pin) && (
        <Card className={hasAccess ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${hasAccess ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                  {hasAccess ? (
                    <KeyRound className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {hasAccess ? 'Sensitive Data Unlocked' : 'Sensitive Data Protected'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasAccess 
                      ? `Access expires in ${Math.ceil((expiresAt! - Date.now()) / 60000)} minutes`
                      : 'CVV and PIN are protected. Unlock to view.'}
                  </p>
                </div>
              </div>
              {isPasswordSet ? (
                hasAccess ? (
                  <Button variant="outline" size="sm" onClick={revokeAccess} className="gap-2">
                    <Lock className="h-4 w-4" />
                    Lock Now
                  </Button>
                ) : (
                  <SensitivePasswordDialog onVerified={grantAccess} />
                )
              ) : (
                <SetSensitivePasswordDialog 
                  trigger={
                    <Button variant="default" size="sm" className="gap-2">
                      <KeyRound className="h-4 w-4" />
                      Set Security Password
                    </Button>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No cards"
          description="Add your credit or debit cards to track expenses."
          actionLabel="Add Card"
          actionHref="/accounts/cards/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((card) => {
            const gradientClass = cardTypeColors[card.cardType || 'CREDIT'];
            const badgeClass = cardTypeBadgeColors[card.cardType || 'CREDIT'];
            
            return (
              <Card key={card._id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${gradientClass}`} />
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{card.cardName}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={`text-xs ${badgeClass}`}>
                            {card.cardType || 'CREDIT'}
                          </Badge>
                          {card.cardNetwork && (
                            <Badge variant="outline" className="text-xs">
                              {card.cardNetwork}
                            </Badge>
                          )}
                          {!card.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/accounts/cards/${card._id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Card</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{card.cardName}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(card._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Card Number */}
                  {(card.cardNumber || card.last4Digits) && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Card Number</p>
                        <p className="font-mono text-sm">
                          {visibleSecrets[card._id]?.cardNumber && card.cardNumber
                            ? card.cardNumber.replace(/(.{4})/g, '$1 ').trim()
                            : maskCardNumber(card.cardNumber) || `**** **** **** ${card.last4Digits}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {card.cardNumber && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleVisibility(card._id, 'cardNumber')}
                          >
                            {visibleSecrets[card._id]?.cardNumber ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(card.cardNumber || card.last4Digits || '', `${card._id}-number`)}
                        >
                          {copiedField === `${card._id}-number` ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Expiry and CVV */}
                  <div className="grid grid-cols-2 gap-2">
                    {(card.expiryMonth && card.expiryYear) && (
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Expiry</p>
                        <p className="font-mono text-sm">
                          {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear.toString().slice(-2)}
                        </p>
                      </div>
                    )}
                    {card.cvv && (
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            CVV {!hasAccess && <Lock className="h-3 w-3" />}
                          </p>
                          <p className="font-mono text-sm">
                            {hasAccess && visibleSecrets[card._id]?.cvv ? card.cvv : '***'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleVisibility(card._id, 'cvv')}
                            disabled={!hasAccess}
                          >
                            {hasAccess && visibleSecrets[card._id]?.cvv ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => hasAccess && copyToClipboard(card.cvv || '', `${card._id}-cvv`)}
                            disabled={!hasAccess}
                          >
                            {copiedField === `${card._id}-cvv` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PIN */}
                  {card.pin && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          ATM PIN {!hasAccess && <Lock className="h-3 w-3" />}
                        </p>
                        <p className="font-mono text-sm">
                          {hasAccess && visibleSecrets[card._id]?.pin ? card.pin : '****'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleVisibility(card._id, 'pin')}
                          disabled={!hasAccess}
                        >
                          {hasAccess && visibleSecrets[card._id]?.pin ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => hasAccess && copyToClipboard(card.pin || '', `${card._id}-pin`)}
                          disabled={!hasAccess}
                        >
                          {copiedField === `${card._id}-pin` ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Balance */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">
                      {card.cardType === 'CREDIT' ? 'Outstanding Balance' : 'Balance'}
                    </p>
                    <p className={`text-xl font-bold ${card.cardType === 'CREDIT' ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {formatCurrency(card.currentBalance, currency)}
                    </p>
                    {card.creditLimit && (
                      <p className="text-xs text-muted-foreground">
                        Limit: {formatCurrency(card.creditLimit, currency)}
                      </p>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {card.billingCycleDay && (
                      <p>Billing cycle: Day {card.billingCycleDay}</p>
                    )}
                    {card.linkedBankId && (
                      <p>Linked: {card.linkedBankId.bankName}</p>
                    )}
                    {card.linkedMemberId && (
                      <p>Member: {card.linkedMemberId.name}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
