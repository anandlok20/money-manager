'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Building2,
  CreditCard,
  Receipt,
  PiggyBank,
  Target,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Upload,
  Plane,
  Car,
  Shield,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  tips?: string[];
}

const gettingStartedSteps: Step[] = [
  {
    number: 1,
    title: 'Add Family Members',
    description: 'Start by adding family members who share expenses. This helps you track who made each transaction.',
    icon: <Users className="h-5 w-5" />,
    href: '/members/new',
    tips: [
      'Add yourself first (Self type)',
      'Add spouse, children, or other family members',
      'You can also add friends for shared expenses',
    ],
  },
  {
    number: 2,
    title: 'Add Bank Accounts',
    description: 'Connect your bank accounts to track your money. Enter your account details and current balance.',
    icon: <Building2 className="h-5 w-5" />,
    href: '/accounts/banks/new',
    tips: [
      'Add all your savings and current accounts',
      'Enter the accurate current balance',
      'UPI ID helps for quick reference',
    ],
  },
  {
    number: 3,
    title: 'Add Credit/Debit Cards',
    description: 'Add your cards to track card spending separately. Link them to bank accounts for bill payments.',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/accounts/cards/new',
    tips: [
      'Add credit cards with credit limit',
      'Set billing cycle day for reminders',
      'Link to bank account for easy tracking',
    ],
  },
  {
    number: 4,
    title: 'Start Recording Transactions',
    description: 'Record your daily income and expenses. This is the core of tracking your finances.',
    icon: <Receipt className="h-5 w-5" />,
    href: '/transactions/new',
    tips: [
      'Record transactions as they happen',
      'Choose the right category for better insights',
      'Add notes for future reference',
      'Use tags for custom grouping',
    ],
  },
];

const additionalFeatures: Step[] = [
  {
    number: 5,
    title: 'Track Investments',
    description: 'Add your mutual funds, stocks, fixed deposits, and other investments to track your portfolio.',
    icon: <PiggyBank className="h-5 w-5" />,
    href: '/investments/new',
    tips: [
      'Track mutual funds, stocks, FDs, PPF, NPS',
      'Update current values periodically',
      'See your total investment portfolio',
    ],
  },
  {
    number: 6,
    title: 'Set Financial Goals',
    description: 'Create savings goals like emergency fund, vacation, or home purchase to stay motivated.',
    icon: <Target className="h-5 w-5" />,
    href: '/goals/new',
    tips: [
      'Set realistic deadlines',
      'Update progress regularly',
      'Track multiple goals simultaneously',
    ],
  },
  {
    number: 7,
    title: 'Create Budgets',
    description: 'Set monthly budgets for different categories to control your spending.',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/budgets',
    tips: [
      'Create budgets for high-spending categories',
      'Get alerts when nearing budget limits',
      'Review and adjust budgets monthly',
    ],
  },
  {
    number: 8,
    title: 'Schedule Recurring Payments',
    description: 'Set up reminders for rent, EMIs, subscriptions, and other regular payments.',
    icon: <Calendar className="h-5 w-5" />,
    href: '/scheduled-payments/new',
    tips: [
      'Add all your recurring bills',
      'Set correct frequency (monthly, yearly)',
      'Never miss a payment again',
    ],
  },
  {
    number: 9,
    title: 'Plan Trips',
    description: 'Organize travel plans with budgets, tickets, hotels, and places to visit.',
    icon: <Plane className="h-5 w-5" />,
    href: '/trips/new',
    tips: [
      'Set trip budget upfront',
      'Add travelers and split expenses',
      'Track all trip-related transactions',
    ],
  },
  {
    number: 10,
    title: 'Track Vehicles',
    description: 'Manage your vehicles with purchase details, current value, and maintenance records.',
    icon: <Car className="h-5 w-5" />,
    href: '/vehicles/new',
    tips: [
      'Track vehicle depreciation',
      'Store registration details',
      'Link fuel expenses to vehicles',
    ],
  },
  {
    number: 11,
    title: 'Store Documents',
    description: 'Keep important documents like insurance, IDs, and agreements organized.',
    icon: <FileText className="h-5 w-5" />,
    href: '/documents/new',
    tips: [
      'Store insurance documents',
      'Track expiry dates',
      'Keep everything in one place',
    ],
  },
  {
    number: 12,
    title: 'Tax Planning',
    description: 'Track tax-saving investments and deductions to maximize savings.',
    icon: <Calculator className="h-5 w-5" />,
    href: '/tax',
    tips: [
      'Track 80C investments',
      'Plan deductions in advance',
      'See tax savings summary',
    ],
  },
];

const faqItems = [
  {
    question: 'How do I add transactions?',
    answer: 'Go to Transactions → click the Add Transaction button (top right). Fill in the amount, category, and other details.',
  },
  {
    question: 'How do I edit or delete a transaction?',
    answer: 'Go to Transactions list, click on any transaction to view details, then use the Edit or Delete buttons.',
  },
  {
    question: 'How is Net Worth calculated?',
    answer: 'Net Worth = Total Bank Balance + Investment Value - Credit Card Outstanding. It gives you a complete picture of your financial health.',
  },
  {
    question: 'Can I track shared expenses?',
    answer: 'Yes! When adding a transaction, select the member who made the expense. You can also use Trips to track group travel expenses.',
  },
  {
    question: 'How do I change the currency?',
    answer: 'Go to Settings → Currency and select your preferred currency. All amounts will be displayed in that currency.',
  },
  {
    question: 'How do I log out?',
    answer: 'Go to Settings and scroll to the bottom. Click the "Sign Out" button to log out of your account.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes! Your data is stored securely in the cloud with encryption. We never share your financial data with third parties.',
  },
  {
    question: 'How do I reset my password?',
    answer: 'On the login page, click "Forgot Password" and enter your email. You\'ll receive a link to reset your password.',
  },
];

export default function HowToUsePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">How to Use This App</h1>
          <p className="text-muted-foreground">
            A complete guide to managing your finances
          </p>
        </div>
      </div>

      {/* Quick Overview */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Quick Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This app helps you track all your finances in one place - income, expenses, 
            investments, goals, and more. Here&apos;s a quick summary:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Track daily income & expenses</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Monitor bank accounts & cards</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Track investments & net worth</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Set budgets & financial goals</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Import bank statements (PDF)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Plan trips & track travel expenses</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started (Essential Steps)</CardTitle>
          <CardDescription>
            Follow these steps in order to set up your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {gettingStartedSteps.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {step.number}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                  {step.href && (
                    <Link href={step.href}>
                      <Button variant="outline" size="sm" className="gap-1">
                        Go <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.tips && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Tips:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {step.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Additional Features */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Features</CardTitle>
          <CardDescription>
            Explore these features to get the most out of the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {additionalFeatures.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-bold">
                  {step.number}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                  {step.href && (
                    <Link href={step.href}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        Go <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.tips && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Tips:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {step.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navigation Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation Guide</CardTitle>
          <CardDescription>
            How to find your way around the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Dashboard</p>
                  <p className="text-xs text-muted-foreground">Home page with overview</p>
                </div>
              </div>
              <Badge variant="outline">Home</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Transactions</p>
                  <p className="text-xs text-muted-foreground">All income & expenses</p>
                </div>
              </div>
              <Badge variant="outline">Left Menu</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Accounts</p>
                  <p className="text-xs text-muted-foreground">Banks & Cards</p>
                </div>
              </div>
              <Badge variant="outline">Left Menu</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">Preferences & Sign Out</p>
                </div>
              </div>
              <Badge variant="outline">Bottom Menu</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Common questions and answers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Link href="/transactions/new">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Receipt className="h-4 w-4" />
              Add Transaction
            </Button>
          </Link>
          <Link href="/accounts/banks/new">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Building2 className="h-4 w-4" />
              Add Bank Account
            </Button>
          </Link>
          <Link href="/investments/new">
            <Button variant="outline" className="w-full justify-start gap-2">
              <PiggyBank className="h-4 w-4" />
              Add Investment
            </Button>
          </Link>
          <Link href="/goals/new">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Target className="h-4 w-4" />
              Create Goal
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Need More Help?</h3>
              <p className="text-sm text-muted-foreground">
                If you have any questions or issues, check the settings or contact support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
