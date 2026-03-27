'use client';

import { useState, useEffect } from 'react';
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
  Wand2,
  Eye,
  Check,
  Crown,
  Zap,
  Plus,
  Minus,
  Loader2,
  Lock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supportedCurrencies } from '@/lib/utils/currency';
import { useUIStore, colorThemes, appModes } from '@/stores/uiStore';
import { CurrencyConverter } from '@/components/shared/CurrencyConverter';
import { SetSensitivePasswordDialog, useSensitiveDataAccess } from '@/components/shared/SensitiveDataPassword';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { data: session } = useSession();
  const isMemberUser = session?.user?.isMemberUser;
  const { theme, setTheme } = useTheme();
  const { isPasswordSet } = useSensitiveDataAccess();
  const { currency, setCurrency, colorTheme, setColorTheme, appMode, setAppMode } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<{
    plan: string;
    monthlyCost: number;
    planCost: number;
    addonCost: number;
    activeAddons: { addonId: string; quantity: number }[];
    addonDefinitions: { id: string; name: string; emoji: string; description: string; price: number; type: string; category: string }[];
    limits: { banks: number; cards: number; goals: number; members: number };
  } | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subActionLoading, setSubActionLoading] = useState<string | null>(null);

  // Fetch subscription data
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/subscription', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSubscription(data.data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch subscription:', err);
        }
      })
      .finally(() => setSubLoading(false));
    return () => controller.abort();
  }, []);

  const handleAddonToggle = async (addonId: string, isActive: boolean) => {
    setSubActionLoading(addonId);
    try {
      const res = await fetch('/api/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isActive ? 'remove-addon' : 'add-addon',
          addonId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscription(data.data);
        toast.success(isActive ? 'Add-on removed' : 'Add-on activated');
      }
    } catch {
      toast.error('Failed to update add-on');
    } finally {
      setSubActionLoading(null);
    }
  };

  const handlePlanChange = async (newPlan: 'free' | 'premium') => {
    setSubActionLoading('plan');
    try {
      const res = await fetch('/api/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: newPlan === 'premium' ? 'upgrade' : 'downgrade',
          plan: newPlan,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscription(data.data);
        toast.success(newPlan === 'premium' ? 'Upgraded to Premium! 🎉' : 'Downgraded to Free');
      }
    } catch {
      toast.error('Failed to change plan');
    } finally {
      setSubActionLoading(null);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    toast.success(`Currency changed to ${newCurrency}`);
  };

  const handleColorThemeChange = (newTheme: string) => {
    setColorTheme(newTheme);
    toast.success(`Theme changed to ${colorThemes.find(t => t.id === newTheme)?.name || 'Default'}`);
  };

  const handleModeChange = (modeId: string) => {
    setAppMode(modeId);
    const mode = appModes.find(m => m.id === modeId);
    toast.success(`Mode changed to ${mode?.name || 'Default'}`, {
      description: mode?.description,
    });
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

      {/* Look & Feel Section */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Look &amp; Feel</CardTitle>
              <CardDescription className="text-xs">Transform the entire app experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 relative">
          <Tabs defaultValue="modes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl h-11">
              <TabsTrigger value="modes" className="gap-1.5 rounded-lg text-xs">
                <Wand2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Modes</span>
              </TabsTrigger>
              <TabsTrigger value="themes" className="gap-1.5 rounded-lg text-xs">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Themes</span>
              </TabsTrigger>
              <TabsTrigger value="display" className="gap-1.5 rounded-lg text-xs">
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Display</span>
              </TabsTrigger>
            </TabsList>

            {/* Modes Tab */}
            <TabsContent value="modes" className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium">App Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Each mode transforms fonts, colors, buttons, cards — the entire experience
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {appModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id)}
                    className={`group relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                      appMode === mode.id
                        ? 'border-primary shadow-lg shadow-primary/25 scale-[1.02]'
                        : 'border-border/50 hover:border-primary/40 hover:shadow-md hover:scale-[1.01]'
                    }`}
                  >
                    {/* Preview gradient background */}
                    <div
                      className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                      style={{ background: mode.preview }}
                    />
                    {/* Active check */}
                    {appMode === mode.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-3xl relative z-10 group-hover:scale-110 transition-transform">{mode.emoji}</span>
                    <span className="text-xs font-semibold relative z-10">{mode.name}</span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight relative z-10 line-clamp-2">
                      {mode.description}
                    </span>
                  </button>
                ))}
              </div>
              {/* Active mode indicator */}
              {appMode !== 'default' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <Wand2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-primary">
                    <span className="font-semibold">{appModes.find(m => m.id === appMode)?.name}</span> mode is active —{' '}
                    <button onClick={() => handleModeChange('default')} className="underline hover:no-underline font-medium">
                      Reset to Default
                    </button>
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Themes Tab */}
            <TabsContent value="themes" className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Color Palette
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick a color theme — works with any mode
                </p>
              </div>
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
            </TabsContent>

            {/* Display Tab */}
            <TabsContent value="display" className="mt-4 space-y-5">
              {/* Light/Dark/System */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Appearance</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Switch between light, dark, or system theme
                  </p>
                </div>
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
              </div>

              <Separator />

              {/* Currency */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Subscription & Billing — hidden for member users */}
      {isMemberUser && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Member Account</p>
              <p className="text-xs text-muted-foreground">You are viewing this app as a family member. Subscription settings are managed by the account owner.</p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="relative overflow-hidden" style={isMemberUser ? { display: 'none' } : undefined}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Subscription & Billing</CardTitle>
              <CardDescription className="text-xs">Manage your plan and add-ons</CardDescription>
            </div>
            {subscription && (
              <Badge
                variant={subscription.plan === 'premium' ? 'default' : 'outline'}
                className={subscription.plan === 'premium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : ''}
              >
                {subscription.plan === 'premium' ? (
                  <><Crown className="h-3 w-3 mr-1" /> Premium</>
                ) : (
                  <><Zap className="h-3 w-3 mr-1" /> Free</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 relative">
          {subLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : subscription ? (
            <>
              {/* Current Plan */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-muted/30">
                <div>
                  <p className="font-semibold">
                    {subscription.plan === 'premium' ? 'Premium Plan' : 'Free Plan'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ₹{subscription.monthlyCost}/month total
                  </p>
                </div>
                {subscription.plan === 'free' ? (
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => handlePlanChange('premium')}
                    disabled={subActionLoading === 'plan'}
                  >
                    {subActionLoading === 'plan' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Crown className="h-3 w-3" />
                    )}
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlanChange('free')}
                    disabled={subActionLoading === 'plan'}
                  >
                    {subActionLoading === 'plan' ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Downgrade
                  </Button>
                )}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Banks', value: subscription.limits.banks },
                  { label: 'Cards', value: subscription.limits.cards },
                  { label: 'Goals', value: subscription.limits.goals },
                  { label: 'Members', value: subscription.limits.members },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-muted/20 text-center">
                    <p className="text-lg font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Add-ons */}
              <div>
                <p className="text-sm font-medium mb-3">Add-ons</p>
                <div className="space-y-2">
                  {subscription.addonDefinitions?.map((addon) => {
                    const activeAddon = subscription.activeAddons?.find(
                      (a) => a.addonId === addon.id
                    );
                    const isActive = !!activeAddon;

                    return (
                      <div
                        key={addon.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{addon.emoji}</span>
                          <div>
                            <p className="text-sm font-medium">
                              {addon.name}
                              {isActive && activeAddon && activeAddon.quantity > 1 && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  ×{activeAddon.quantity}
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{addon.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className="text-xs text-muted-foreground">₹{addon.price}/mo</span>
                          <Button
                            variant={isActive ? 'destructive' : 'outline'}
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => handleAddonToggle(addon.id, isActive)}
                            disabled={subActionLoading === addon.id}
                          >
                            {subActionLoading === addon.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isActive ? (
                              'Remove'
                            ) : (
                              'Add'
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No subscription data available</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/select-plan">Choose a Plan</Link>
              </Button>
            </div>
          )}
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
