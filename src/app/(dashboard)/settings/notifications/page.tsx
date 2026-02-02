'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Bell,
  Calendar,
  Wallet,
  CreditCard,
  Car,
  PiggyBank,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface WhatsAppPreferences {
  enabled: boolean;
  phoneNumber?: string;
  verifiedAt?: string;
  dailyExpenseSummary: boolean;
  dailySummaryTime: string;
  weeklyNetWorthSummary: boolean;
  monthlySummary: boolean;
  dueDateAlerts: boolean;
  scheduledPaymentAlerts: boolean;
  lowBalanceAlerts: boolean;
  spendingLimitAlerts: boolean;
  budgetExceededAlerts: boolean;
  vehicleAlerts: boolean;
}

async function fetchPreferences(): Promise<WhatsAppPreferences> {
  const response = await fetch('/api/settings/whatsapp');
  if (!response.ok) throw new Error('Failed to fetch preferences');
  const data = await response.json();
  return data.data;
}

async function updatePreferences(preferences: Partial<WhatsAppPreferences>) {
  const response = await fetch('/api/settings/whatsapp', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update preferences');
  }
  return response.json();
}

async function sendVerification(phoneNumber: string) {
  const response = await fetch('/api/settings/whatsapp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send verification');
  }
  return response.json();
}

async function sendTestMessage() {
  const response = await fetch('/api/settings/whatsapp/test', {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send test message');
  }
  return response.json();
}

const timeOptions = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
];

export default function WhatsAppNotificationsPage() {
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState('');

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['whatsapp-preferences'],
    queryFn: fetchPreferences,
  });

  // Update phone number state when preferences load
  const displayPhone = phoneNumber || preferences?.phoneNumber?.replace(/^91/, '') || '';

  const updateMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      toast.success('Preferences updated');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-preferences'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: sendVerification,
    onSuccess: () => {
      toast.success('Verification message sent! Check your WhatsApp.');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-preferences'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: sendTestMessage,
    onSuccess: () => {
      toast.success('Test message sent! Check your WhatsApp.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleToggle = (key: keyof WhatsAppPreferences, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  const handleTimeChange = (value: string) => {
    updateMutation.mutate({ dailySummaryTime: value });
  };

  const handleVerifyPhone = () => {
    const phoneToVerify = phoneNumber || displayPhone;
    if (!phoneToVerify) {
      toast.error('Please enter a phone number');
      return;
    }
    verifyMutation.mutate(phoneToVerify);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load preferences</p>
        <Link href="/settings">
          <Button variant="outline">Go Back</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const isVerified = !!preferences?.verifiedAt;
  const isEnabled = preferences?.enabled && isVerified;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-500" />
            WhatsApp Notifications
          </h1>
          <p className="text-muted-foreground">
            Receive alerts and summaries on WhatsApp
          </p>
        </div>
      </div>

      {/* Setup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Number Setup
          </CardTitle>
          <CardDescription>
            Add and verify your WhatsApp number to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="phone">WhatsApp Number</Label>
              <div className="flex gap-2 mt-1.5">
                <span className="flex items-center px-3 bg-muted rounded-md text-sm">
                  +91
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={displayPhone}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  maxLength={10}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleVerifyPhone}
                disabled={verifyMutation.isPending || (!phoneNumber && !displayPhone)}
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isVerified ? 'Re-verify' : 'Verify'}
              </Button>
            </div>
          </div>

          {isVerified ? (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-400">Verified</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Your WhatsApp number is verified and ready to receive notifications.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Required</AlertTitle>
              <AlertDescription>
                Click &quot;Verify&quot; to receive a test message on WhatsApp. This confirms your number is correct.
              </AlertDescription>
            </Alert>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Enable WhatsApp Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off all WhatsApp notifications
              </p>
            </div>
            <Switch
              checked={preferences?.enabled || false}
              onCheckedChange={(checked) => handleToggle('enabled', checked)}
              disabled={!isVerified || updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Daily Expense Summary
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get a summary of your daily expenses every day
                </p>
              </div>
              <Switch
                checked={preferences?.dailyExpenseSummary || false}
                onCheckedChange={(checked) => handleToggle('dailyExpenseSummary', checked)}
                disabled={!isEnabled || updateMutation.isPending}
              />
            </div>
            {preferences?.dailyExpenseSummary && (
              <div className="ml-6 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Send at:</Label>
                <Select
                  value={preferences?.dailySummaryTime || '21:00'}
                  onValueChange={handleTimeChange}
                  disabled={!isEnabled || updateMutation.isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="border-t" />

          {/* Weekly Net Worth */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-500" />
                Weekly Net Worth Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                Total net worth with income & expenses (every Sunday)
              </p>
            </div>
            <Switch
              checked={preferences?.weeklyNetWorthSummary || false}
              onCheckedChange={(checked) => handleToggle('weeklyNetWorthSummary', checked)}
              disabled={!isEnabled || updateMutation.isPending}
            />
          </div>

          <div className="border-t" />

          {/* Monthly Summary */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-purple-500" />
                Monthly Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                Category-wise expense breakdown (1st of every month)
              </p>
            </div>
            <Switch
              checked={preferences?.monthlySummary || false}
              onCheckedChange={(checked) => handleToggle('monthlySummary', checked)}
              disabled={!isEnabled || updateMutation.isPending}
            />
          </div>

          <div className="border-t" />

          {/* Due Date Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Due Date Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Reminders for upcoming bill due dates
              </p>
            </div>
            <Switch
              checked={preferences?.dueDateAlerts || false}
              onCheckedChange={(checked) => handleToggle('dueDateAlerts', checked)}
              disabled={!isEnabled || updateMutation.isPending}
            />
          </div>

          <div className="border-t" />

          {/* Scheduled Payment Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-500" />
                Scheduled Payment Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Notifications when scheduled payments are executed
              </p>
            </div>
            <Switch
              checked={preferences?.scheduledPaymentAlerts || false}
              onCheckedChange={(checked) => handleToggle('scheduledPaymentAlerts', checked)}
              disabled={!isEnabled || updateMutation.isPending}
            />
          </div>

          <div className="border-t" />

          {/* Low Balance Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-red-500" />
                Low Balance Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Alert when bank balance falls below minimum
              </p>
            </div>
            <Switch
              checked={preferences?.lowBalanceAlerts || false}
              onCheckedChange={(checked) => handleToggle('lowBalanceAlerts', checked)}
              disabled={!isEnabled || updateMutation.isPending}
            />
          </div>

          <div className="border-t" />

          {/* Spending Limit Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-500" />
                Spending Limit Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Alert when card spending exceeds set limit
              </p>
            </div>
            <Switch
              checked={preferences?.spendingLimitAlerts || false}
              onCheckedChange={(checked) => handleToggle('spendingLimitAlerts', checked)}
              disabled={!isEnabled || updateMutation.isPending}
            />
          </div>

          <div className="border-t" />

          {/* Budget Exceeded Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-rose-500" />
                Budget Exceeded Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Alert when budget limit is exceeded
              </p>
            </div>
            <Switch
              checked={preferences?.budgetExceededAlerts || false}
              onCheckedChange={(checked) => handleToggle('budgetExceededAlerts', checked)}
              disabled={!isEnabled || updateMutation.isPending}
            />
          </div>

          <div className="border-t" />

          {/* Vehicle Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Car className="h-4 w-4 text-indigo-500" />
                Vehicle Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Insurance, PUC, fitness & other vehicle reminders
              </p>
            </div>
            <Switch
              checked={preferences?.vehicleAlerts || false}
              onCheckedChange={(checked) => handleToggle('vehicleAlerts', checked)}
              disabled={!isEnabled || updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Message */}
      {isEnabled && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">Test Your Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Send a test message to verify everything is working
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test Message
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <MessageCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">How it works</p>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>Daily summaries are sent at your chosen time</li>
                <li>Alerts are sent immediately when triggered</li>
                <li>Weekly summaries are sent every Sunday at 10 AM</li>
                <li>Monthly summaries are sent on the 1st of each month</li>
                <li>You can disable notifications anytime</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
