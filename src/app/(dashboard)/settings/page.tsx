'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Sparkles,
  BookOpen,
  ChevronRight,
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supportedCurrencies } from '@/lib/utils/currency';
import { useUIStore, colorThemes } from '@/stores/uiStore';
import { CurrencyConverter } from '@/components/shared/CurrencyConverter';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, colorTheme, setColorTheme } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    toast.success(`Currency changed to ${newCurrency}`);
  };

  const handleColorThemeChange = (newTheme: string) => {
    setColorTheme(newTheme);
    toast.success(`Theme changed to ${colorThemes.find(t => t.id === newTheme)?.name || 'Default'}`);
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

          <Separator />

          {/* Theme & Color Theme Combined */}
          <div className="space-y-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Theme
              </Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred appearance
              </p>
            </div>
            
            {/* Light/Dark/System Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
            
            {/* Color Themes */}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Color Palette</p>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-3">
                  {colorThemes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleColorThemeChange(t.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all min-w-[80px] ${
                        colorTheme === t.id
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      <span className="text-2xl">{t.emoji}</span>
                      <span className="text-xs font-medium whitespace-nowrap">{t.name}</span>
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
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
          {/* How to Use Link */}
          <Link href="/settings/how-to-use">
            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">How to Use This App</p>
                  <p className="text-xs text-muted-foreground">
                    Step-by-step guide and FAQ
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>
          
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              Family Expense Manager v1.0.0
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              A family expense and finance management application to track your income,
              expenses, investments, and family spending.
            </p>
          </div>
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
