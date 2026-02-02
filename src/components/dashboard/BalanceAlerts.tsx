'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AlertTriangle, Wallet, CreditCard } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';

interface BankAccount {
  _id: string;
  bankName: string;
  displayName: string;
  currentBalance: number;
  minimumBalance?: number;
  minimumBalanceAlert: boolean;
}

interface CardAccount {
  _id: string;
  cardName: string;
  displayName: string;
  currentSpending: number;
  spendingLimit?: number;
  spendingLimitAlert: boolean;
}

interface AlertsData {
  lowBalanceAccounts: BankAccount[];
  overSpendingCards: CardAccount[];
}

async function fetchAlerts(): Promise<AlertsData> {
  const response = await fetch('/api/dashboard/alerts');
  if (!response.ok) throw new Error('Failed to fetch alerts');
  const data = await response.json();
  return data.data;
}

export function BalanceAlerts() {
  const { data: session } = useSession();
  const currency = (session?.user as unknown as { currency?: string })?.currency || 'INR';

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['balance-alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) return null;

  const hasAlerts = 
    (alerts?.lowBalanceAccounts?.length || 0) > 0 || 
    (alerts?.overSpendingCards?.length || 0) > 0;

  if (!hasAlerts) return null;

  return (
    <div className="space-y-3">
      {/* Low Balance Alerts */}
      {alerts?.lowBalanceAccounts?.map((account) => (
        <Alert key={account._id} variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-400 flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Low Balance Warning
          </AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                <strong>{account.bankName}</strong> balance ({formatCurrency(account.currentBalance, currency)}) 
                is below minimum ({formatCurrency(account.minimumBalance || 0, currency)})
              </span>
              <Link href={`/accounts/banks/${account._id}`}>
                <Button size="sm" variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30">
                  View Account
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Over Spending Alerts */}
      {alerts?.overSpendingCards?.map((card) => (
        <Alert key={card._id} variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-400 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Spending Limit Exceeded
          </AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>
                <strong>{card.cardName}</strong> spending ({formatCurrency(card.currentSpending, currency)}) 
                exceeds limit ({formatCurrency(card.spendingLimit || 0, currency)})
              </span>
              <Link href={`/accounts/cards/${card._id}`}>
                <Button size="sm" variant="outline" className="border-red-500 text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30">
                  View Card
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
