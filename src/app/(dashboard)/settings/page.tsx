'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Moon,
  Sun,
  Monitor,
  LogOut,
  User,
  Shield,
  Palette,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supportedCurrencies } from '@/lib/utils/currency';
import { useUIStore } from '@/stores/uiStore';
import { CurrencyConverter } from '@/components/shared/CurrencyConverter';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    toast.success(`Currency changed to ${newCurrency}`);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred theme
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4" />
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Currency */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Currency</Label>
              <p className="text-sm text-muted-foreground">
                Set your default currency
              </p>
            </div>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Manage your security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>App Lock</Label>
              <p className="text-sm text-muted-foreground">
                Require PIN to access the app
              </p>
            </div>
            <Switch disabled />
          </div>
          <p className="text-xs text-muted-foreground">
            App Lock feature coming soon
          </p>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about important updates
              </p>
            </div>
            <Switch disabled />
          </div>
          <p className="text-xs text-muted-foreground">
            Notifications coming soon
          </p>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle>Help & Support</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Family Expense Manager v1.0.0
          </p>
          <p className="text-sm text-muted-foreground">
            A family expense and finance management application to track your income,
            expenses, investments, and family spending.
          </p>
        </CardContent>
      </Card>

      {/* Currency Converter */}
      <CurrencyConverter
        defaultFromCurrency="USD"
        defaultToCurrency={currency}
      />

      {/* Sign Out */}
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
            disabled={isLoading}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
