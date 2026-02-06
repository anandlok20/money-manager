'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users,
  Building2,
  CreditCard,
  PiggyBank,
  Target,
  Tag,
  CheckCircle2,
  ChevronRight,
  X,
  Rocket,
  KeyRound,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  checkKey: string;
  required?: boolean;
}

const setupSteps: SetupStep[] = [
  {
    id: 'members',
    title: 'Add Family Members',
    description: 'Add your family members to track expenses by person',
    icon: <Users className="h-5 w-5" />,
    href: '/members/new',
    checkKey: 'hasMembers',
    required: true,
  },
  {
    id: 'bank-accounts',
    title: 'Add Bank Accounts',
    description: 'Connect your bank accounts to track balances',
    icon: <Building2 className="h-5 w-5" />,
    href: '/accounts/banks/new',
    checkKey: 'hasBankAccounts',
    required: true,
  },
  {
    id: 'cards',
    title: 'Add Credit/Debit Cards',
    description: 'Add your cards to track spending',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/accounts/cards/new',
    checkKey: 'hasCards',
  },
  {
    id: 'sensitive-password',
    title: 'Set Security Password',
    description: 'Protect sensitive card info like CVV and PIN',
    icon: <KeyRound className="h-5 w-5" />,
    href: '/settings',
    checkKey: 'hasSensitivePassword',
    required: true,
  },
  {
    id: 'categories',
    title: 'Customize Categories',
    description: 'Set up income and expense categories',
    icon: <Tag className="h-5 w-5" />,
    href: '/settings',
    checkKey: 'hasCategories',
  },
  {
    id: 'investments',
    title: 'Add Investments',
    description: 'Track your mutual funds, stocks, and more',
    icon: <PiggyBank className="h-5 w-5" />,
    href: '/investments/new',
    checkKey: 'hasInvestments',
  },
  {
    id: 'goals',
    title: 'Set Financial Goals',
    description: 'Create savings goals to stay motivated',
    icon: <Target className="h-5 w-5" />,
    href: '/goals/new',
    checkKey: 'hasGoals',
  },
];

interface SetupStatus {
  hasMembers: boolean;
  hasBankAccounts: boolean;
  hasCards: boolean;
  hasSensitivePassword: boolean;
  hasCategories: boolean;
  hasInvestments: boolean;
  hasGoals: boolean;
  memberCount: number;
}

export function GettingStarted() {
  // Initialize dismissed from localStorage synchronously to avoid flash
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('getting-started-dismissed') === 'true';
    }
    return false;
  });

  // Fetch setup status
  const { data: status, isLoading } = useQuery<SetupStatus>({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const response = await fetch('/api/setup-status');
      if (!response.ok) throw new Error('Failed to fetch setup status');
      const data = await response.json();
      return data.data;
    },
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('getting-started-dismissed', 'true');
  };

  // Don't show if dismissed or loading
  if (dismissed || isLoading) return null;

  // Check if setup is complete (has at least one member beyond self, and has bank accounts)
  // A default "Self" member is created automatically, so we check for more than 1 member
  // or just check if they have bank accounts (indicating they've started setting up)
  const isSetupComplete = status?.hasBankAccounts || (status?.memberCount && status.memberCount > 1);

  if (isSetupComplete) return null;

  // Calculate progress
  const completedSteps = setupSteps.filter(
    (step) => status?.[step.checkKey as keyof SetupStatus]
  ).length;
  const progress = (completedSteps / setupSteps.length) * 100;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 flex-shrink-0">
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg leading-tight">Welcome! Let&apos;s get started</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Complete these steps to set up your finance manager
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 -mr-1"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Setup Progress</span>
            <span className="font-medium">{completedSteps}/{setupSteps.length} completed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 sm:px-6">
        <div className="grid gap-2">
          {setupSteps.map((step) => {
            const isCompleted = status?.[step.checkKey as keyof SetupStatus];

            return (
              <Link
                key={step.id}
                href={isCompleted ? '#' : step.href}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors',
                  isCompleted
                    ? 'bg-muted/50 cursor-default'
                    : 'bg-card hover:bg-muted border border-border/50'
                )}
                onClick={(e) => isCompleted && e.preventDefault()}
              >
                <div
                  className={cn(
                    'p-1.5 sm:p-2 rounded-full flex-shrink-0',
                    isCompleted
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span className="[&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">
                      {step.icon}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium text-xs sm:text-sm leading-tight',
                    isCompleted && 'text-muted-foreground line-through'
                  )}>
                    {step.title}
                    {step.required && !isCompleted && (
                      <span className="ml-1 text-xs text-destructive">*</span>
                    )}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                    {step.description}
                  </p>
                </div>
                {!isCompleted && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-3">
          <span className="text-destructive">*</span> Required steps
        </p>
      </CardContent>
    </Card>
  );
}
