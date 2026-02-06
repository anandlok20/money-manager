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
  KeyRound,
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
import { SetSensitivePasswordDialog, useSensitiveDataAccess } from '@/components/shared/SensitiveDataPassword';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { isPasswordSet } = useSensitiveDataAccess();
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
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription className="text-xs">Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div>
              <p className="font-semibold">{session?.user?.name}</p>
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription className="text-xs">Customize how the app looks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Currency */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-muted/30">
            <div className="space-y-0.5">
              <Label className="font-medium">Currency</Label>
              <p className="text-xs text-muted-foreground">
                Set your default currency
              </p>
            </div>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-full sm:w-[200px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
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
              <Label className="flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                Theme
              </Label>
              <p className="text-xs text-muted-foreground">
                Choose your preferred appearance
              </p>
            </div>
            
            {/* Light/Dark/System Toggle */}
            <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl w-fit">
              <Button
                variant={theme === 'light' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTheme('light')}
                className="gap-2 rounded-lg"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="gap-2 rounded-lg"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTheme('system')}
                className="gap-2 rounded-lg"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
            
            {/* Color Themes */}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Color Palette</p>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-3">
                  {colorThemes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleColorThemeChange(t.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all min-w-[90px] ${
                        colorTheme === t.id
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-transparent hover:bg-muted/60 hover:scale-105'
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription className="text-xs">Manage your security settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sensitive Data Password */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-muted/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="font-medium flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Sensitive Data Password
                </Label>
                {isPasswordSet && (
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Protect CVV, PIN, and other sensitive card information
              </p>
            </div>
            <SetSensitivePasswordDialog 
              isUpdate={isPasswordSet}
              trigger={
                <Button variant={isPasswordSet ? "outline" : "default"} size="sm" className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  {isPasswordSet ? 'Change' : 'Set Password'}
                </Button>
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div className="space-y-0.5">
              <Label className="font-medium">App Lock</Label>
              <p className="text-xs text-muted-foreground">
                Require PIN to access the app
              </p>
            </div>
            <Switch disabled />
          </div>
          <p className="text-xs text-muted-foreground px-1">
            App Lock feature coming soon
          </p>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription className="text-xs">Configure notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div className="space-y-0.5">
              <Label className="font-medium">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Get notified about important updates
              </p>
            </div>
            <Switch disabled />
          </div>
          <p className="text-xs text-muted-foreground px-1">
            Notifications coming soon
          </p>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Help & Support</CardTitle>
              <CardDescription className="text-xs">Get help and learn more</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* How to Use Link */}
          <Link href="/settings/how-to-use">
            <Button variant="outline" className="w-full justify-between h-auto py-4 rounded-xl hover:bg-muted/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">How to Use This App</p>
                  <p className="text-xs text-muted-foreground">
                    Step-by-step guide and FAQ
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>
          
          <div className="pt-4 px-1">
            <p className="text-sm font-medium text-muted-foreground">
              Family Expense Manager v1.0.0
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
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
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full rounded-xl"
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
