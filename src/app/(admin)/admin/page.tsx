'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Users,
  Crown,
  Shield,
  Loader2,
  Settings,
  LogOut,
  Plus,
  Minus,
  DollarSign,
  RefreshCw,
  Home,
  MoreVertical,
  UserCircle,
  ChevronRight,
  Trash2,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface Addon {
  addonId: string;
  quantity: number;
  activatedAt: string;
}

interface UserSub {
  plan: string;
  status: string;
  addons: Addon[];
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  hasSelectedPlan: boolean;
  currency: string;
  createdAt: string;
  subscription: UserSub | null;
}

interface AddonDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  price: number;
  type: 'feature' | 'stackable';
  category: string;
}

interface PricingData {
  _id: string;
  freePlanPrice: number;
  premiumPlanPrice: number;
  freeLimits: {
    banks: number;
    cards: number;
    goals: number;
    members: number;
    investments: boolean;
    reports: boolean;
    freeThemes: string[];
  };
  premiumLimits: {
    banks: number;
    cards: number;
    goals: number;
    members: number;
    investments: boolean;
    reports: boolean;
    freeThemes: string[];
  };
  addons: AddonDef[];
}

/* ─── Mobile User Card ───────────────────────────────────── */
function UserCard({
  user,
  pricing,
  onAction,
}: {
  user: UserData;
  pricing: PricingData | null;
  onAction: (userId: string, action: string, extra?: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 active:bg-muted/60 transition-colors cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{user.name}</p>
            {user.role === 'admin' && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant={user.subscription?.plan === 'premium' ? 'default' : 'outline'}
            className={cn(
              'text-[10px] px-1.5 py-0 h-4',
              user.subscription?.plan === 'premium' && 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            )}
          >
            {user.subscription?.plan === 'premium' ? '👑 Premium' : 'Free'}
          </Badge>
          {(user.subscription?.addons?.length ?? 0) > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {user.subscription!.addons.length} add-on{user.subscription!.addons.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>

      {/* User Detail Bottom Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base">{user.name}</SheetTitle>
                <SheetDescription className="text-xs truncate">{user.email}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-3 pb-4">
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-semibold mt-0.5 capitalize">{user.role}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-semibold mt-0.5 capitalize">{user.subscription?.plan || 'Free'}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="text-sm font-semibold mt-0.5">
                {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>

          {/* Active Add-ons */}
          {(user.subscription?.addons?.length ?? 0) > 0 && (
            <div className="pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Add-ons</p>
              <div className="space-y-2">
                {user.subscription!.addons.map((a) => {
                  const def = pricing?.addons.find((d) => d.id === a.addonId);
                  return (
                    <div key={a.addonId} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{def?.emoji || '📦'}</span>
                        <div>
                          <p className="text-sm font-medium">{def?.name || a.addonId}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {def?.type === 'stackable' ? `Qty: ${a.quantity}` : 'Feature'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {def?.type === 'stackable' && a.quantity > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => {
                              onAction(user._id, 'update-addon-quantity', { addonId: a.addonId, quantity: a.quantity - 1 });
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        )}
                        {def?.type === 'stackable' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => {
                              onAction(user._id, 'update-addon-quantity', { addonId: a.addonId, quantity: a.quantity + 1 });
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => {
                            onAction(user._id, 'remove-addon', { addonId: a.addonId });
                            setOpen(false);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator className="mb-4" />

          {/* Actions */}
          <div className="space-y-2 pb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>

            {user.subscription?.plan === 'free' ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 rounded-xl"
                onClick={() => { onAction(user._id, 'update-plan', { plan: 'premium' }); setOpen(false); }}
              >
                <Crown className="h-4 w-4 text-amber-500" /> Upgrade to Premium
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 rounded-xl"
                onClick={() => { onAction(user._id, 'update-plan', { plan: 'free' }); setOpen(false); }}
              >
                <DollarSign className="h-4 w-4" /> Downgrade to Free
              </Button>
            )}

            {user.role === 'user' ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 rounded-xl"
                onClick={() => { onAction(user._id, 'update-role', { role: 'admin' }); setOpen(false); }}
              >
                <Shield className="h-4 w-4 text-red-500" /> Make Admin
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 rounded-xl"
                onClick={() => { onAction(user._id, 'update-role', { role: 'user' }); setOpen(false); }}
              >
                <UserCircle className="h-4 w-4" /> Remove Admin
              </Button>
            )}

            <Separator className="my-2" />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Add Add-on</p>
            <div className="grid grid-cols-2 gap-2">
              {pricing?.addons.map((addon) => {
                const activeAddon = user.subscription?.addons?.find((a) => a.addonId === addon.id);
                const isFeatureActive = addon.type === 'feature' && !!activeAddon;
                return (
                  <button
                    key={addon.id}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors text-xs',
                      isFeatureActive
                        ? 'border-green-500/30 bg-green-500/5 opacity-60 cursor-default'
                        : 'border-border/50 active:bg-muted/60'
                    )}
                    onClick={() => {
                      if (!isFeatureActive) {
                        onAction(user._id, 'add-addon', { addonId: addon.id });
                        setOpen(false);
                      }
                    }}
                    disabled={isFeatureActive}
                  >
                    <span className="text-base">{addon.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{addon.name}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-muted-foreground">₹{addon.price}/mo</p>
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                          {addon.type === 'feature' ? 'Once' : 'Stack'}
                        </Badge>
                      </div>
                    </div>
                    {isFeatureActive && <span className="text-[10px] text-green-600">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ─── Main Admin Page ────────────────────────────────────── */
export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  const [editPremiumPrice, setEditPremiumPrice] = useState('');
  const [editFreeLimits, setEditFreeLimits] = useState({ banks: 0, cards: 0, goals: 0, members: 0 });
  const [editPremiumLimits, setEditPremiumLimits] = useState({ banks: 0, cards: 0, goals: 0, members: 0 });

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchPricing = useCallback(async () => {
    setIsLoadingPricing(true);
    try {
      const res = await fetch('/api/admin/pricing');
      const data = await res.json();
      if (data.success) {
        setPricing(data.data);
        setEditPremiumPrice(String(data.data.premiumPlanPrice));
        setEditFreeLimits({
          banks: data.data.freeLimits.banks,
          cards: data.data.freeLimits.cards,
          goals: data.data.freeLimits.goals,
          members: data.data.freeLimits.members,
        });
        setEditPremiumLimits({
          banks: data.data.premiumLimits.banks,
          cards: data.data.premiumLimits.cards,
          goals: data.data.premiumLimits.goals,
          members: data.data.premiumLimits.members,
        });
      }
    } catch {
      toast.error('Failed to fetch pricing');
    } finally {
      setIsLoadingPricing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPricing();
  }, [fetchUsers, fetchPricing]);

  const handleUserAction = async (userId: string, action: string, extra: Record<string, unknown> = {}) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User updated');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch {
      toast.error('Failed to update user');
    }
  };

  const savePricing = async () => {
    setIsSavingPricing(true);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          premiumPlanPrice: Number(editPremiumPrice),
          freeLimits: editFreeLimits,
          premiumLimits: editPremiumLimits,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pricing updated');
        fetchPricing();
      } else {
        toast.error(data.error || 'Failed to update pricing');
      }
    } catch {
      toast.error('Failed to save pricing');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const freeUsersCount = users.filter((u) => !u.subscription || u.subscription.plan === 'free').length;
  const premiumUsersCount = users.filter((u) => u.subscription?.plan === 'premium').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight">Admin</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {session?.user?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                <span className="sr-only">Dashboard</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 sm:p-6 lg:p-8 space-y-6">
        {/* ─── Stats ─── */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Users', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Premium', value: premiumUsersCount, icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Price', value: `₹${pricing?.premiumPlanPrice || 0}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Admins', value: adminCount, icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:gap-3 gap-1">
                    <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
                      <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', stat.color)} />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-lg sm:text-2xl font-bold leading-tight">{stat.value}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-2 rounded-xl h-10 sm:h-11 max-w-xs sm:max-w-md">
            <TabsTrigger value="users" className="gap-1.5 rounded-lg text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5 rounded-lg text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5" /> Pricing
            </TabsTrigger>
          </TabsList>

          {/* ─── Users Tab ─── */}
          <TabsContent value="users" className="mt-4 sm:mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">Users</h2>
                <p className="text-xs text-muted-foreground">
                  {users.length} total &middot; {premiumUsersCount} premium &middot; {freeUsersCount} free
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={isLoadingUsers}
                className="gap-1.5 h-8 rounded-lg"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoadingUsers && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>

            {isLoadingUsers ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Mobile: Tappable card list */}
                <div className="space-y-2 lg:hidden">
                  {users.map((user) => (
                    <UserCard
                      key={user._id}
                      user={user}
                      pricing={pricing}
                      onAction={handleUserAction}
                    />
                  ))}
                </div>

                {/* Desktop: Table */}
                <Card className="hidden lg:block">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left text-xs font-medium text-muted-foreground p-4">User</th>
                            <th className="text-left text-xs font-medium text-muted-foreground p-4">Role</th>
                            <th className="text-left text-xs font-medium text-muted-foreground p-4">Plan</th>
                            <th className="text-left text-xs font-medium text-muted-foreground p-4">Add-ons</th>
                            <th className="text-left text-xs font-medium text-muted-foreground p-4">Joined</th>
                            <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user._id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                                  {user.role === 'admin' ? <><Shield className="h-3 w-3 mr-1" /> Admin</> : 'User'}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <Badge
                                  variant={user.subscription?.plan === 'premium' ? 'default' : 'outline'}
                                  className={cn('text-xs', user.subscription?.plan === 'premium' && 'bg-amber-500/10 text-amber-600 border-amber-500/30')}
                                >
                                  {user.subscription?.plan === 'premium' ? <><Crown className="h-3 w-3 mr-1" /> Premium</> : 'Free'}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-1 flex-wrap max-w-[250px]">
                                  {user.subscription?.addons?.length ? (
                                    user.subscription.addons.map((a) => {
                                      const def = pricing?.addons.find((d) => d.id === a.addonId);
                                      return (
                                        <Badge 
                                          key={a.addonId} 
                                          variant="outline" 
                                          className="text-xs gap-1 pr-1 group hover:bg-destructive/10 hover:border-destructive/30 transition-colors cursor-pointer"
                                          onClick={() => handleUserAction(user._id, 'remove-addon', { addonId: a.addonId })}
                                        >
                                          {def?.emoji || ''} {def?.name || a.addonId}
                                          {a.quantity > 1 && ` x${a.quantity}`}
                                          <Trash2 className="h-3 w-3 ml-0.5 opacity-0 group-hover:opacity-100 text-destructive transition-opacity" />
                                        </Badge>
                                      );
                                    })
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="p-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    {user.subscription?.plan === 'free' ? (
                                      <DropdownMenuItem onClick={() => handleUserAction(user._id, 'update-plan', { plan: 'premium' })}>
                                        <Crown className="h-4 w-4 mr-2 text-amber-500" /> Upgrade to Premium
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleUserAction(user._id, 'update-plan', { plan: 'free' })}>
                                        <DollarSign className="h-4 w-4 mr-2" /> Downgrade to Free
                                      </DropdownMenuItem>
                                    )}
                                    {user.role === 'user' ? (
                                      <DropdownMenuItem onClick={() => handleUserAction(user._id, 'update-role', { role: 'admin' })}>
                                        <Shield className="h-4 w-4 mr-2" /> Make Admin
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleUserAction(user._id, 'update-role', { role: 'user' })}>
                                        <UserCircle className="h-4 w-4 mr-2" /> Remove Admin
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <Plus className="h-4 w-4 mr-2" /> Add Add-on
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="w-56">
                                        {pricing?.addons.map((addon) => {
                                          const activeAddon = user.subscription?.addons?.find((a) => a.addonId === addon.id);
                                          const isFeatureActive = addon.type === 'feature' && !!activeAddon;
                                          return (
                                            <DropdownMenuItem 
                                              key={addon.id} 
                                              onClick={() => !isFeatureActive && handleUserAction(user._id, 'add-addon', { addonId: addon.id })}
                                              disabled={isFeatureActive}
                                              className={isFeatureActive ? 'opacity-50' : ''}
                                            >
                                              <span className="mr-2">{addon.emoji}</span>
                                              <span className="flex-1">{addon.name}</span>
                                              <Badge variant="outline" className="text-[9px] ml-2 px-1 py-0 h-4">
                                                {addon.type === 'feature' ? 'Once' : '+Stack'}
                                              </Badge>
                                              {isFeatureActive && <span className="text-green-600 ml-1">✓</span>}
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    {(user.subscription?.addons?.length ?? 0) > 0 && (
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="text-destructive focus:text-destructive">
                                          <Trash2 className="h-4 w-4 mr-2" /> Remove Add-on
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          {user.subscription?.addons?.map((a) => {
                                            const def = pricing?.addons.find((d) => d.id === a.addonId);
                                            return (
                                              <DropdownMenuItem 
                                                key={a.addonId} 
                                                onClick={() => handleUserAction(user._id, 'remove-addon', { addonId: a.addonId })}
                                                className="text-destructive focus:text-destructive"
                                              >
                                                {def?.emoji} {def?.name || a.addonId}
                                                {a.quantity > 1 && ` (x${a.quantity})`}
                                              </DropdownMenuItem>
                                            );
                                          })}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ─── Pricing Tab ─── */}
          <TabsContent value="pricing" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
            {isLoadingPricing ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pricing ? (
              <>
                {/* Plan Pricing */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Plan Pricing</CardTitle>
                    <CardDescription className="text-xs">Monthly prices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Free Plan</Label>
                        <Input value="₹0" disabled className="bg-muted/30 h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Premium (₹/mo)</Label>
                        <Input
                          type="number"
                          value={editPremiumPrice}
                          onChange={(e) => setEditPremiumPrice(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Limits */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Plan Limits</CardTitle>
                    <CardDescription className="text-xs">Resource limits per plan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Free</Badge>
                          <span className="text-xs text-muted-foreground">Limits</span>
                        </div>
                        {(['banks', 'cards', 'goals', 'members'] as const).map((key) => (
                          <div key={key} className="flex items-center justify-between gap-3">
                            <Label className="capitalize text-sm flex-1">{key}</Label>
                            <Input
                              type="number"
                              className="w-24 text-center h-9"
                              value={editFreeLimits[key]}
                              onChange={(e) =>
                                setEditFreeLimits((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                            <Crown className="h-3 w-3 mr-1" /> Premium
                          </Badge>
                          <span className="text-xs text-muted-foreground">Limits</span>
                        </div>
                        {(['banks', 'cards', 'goals', 'members'] as const).map((key) => (
                          <div key={key} className="flex items-center justify-between gap-3">
                            <Label className="capitalize text-sm flex-1">{key}</Label>
                            <Input
                              type="number"
                              className="w-24 text-center h-9"
                              value={editPremiumLimits[key]}
                              onChange={(e) =>
                                setEditPremiumLimits((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add-ons Catalog */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package className="h-4 w-4" /> Add-on Catalog
                        </CardTitle>
                        <CardDescription className="text-xs">{pricing.addons.length} add-ons configured</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pricing.addons.map((addon) => (
                        <div key={addon.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                          <span className="text-xl shrink-0">{addon.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{addon.name}</p>
                              <Badge 
                                variant={addon.type === 'feature' ? 'default' : 'secondary'} 
                                className={cn(
                                  'text-[9px] px-1.5 py-0 h-4',
                                  addon.type === 'feature' 
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' 
                                    : 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                                )}
                              >
                                {addon.type === 'feature' ? '🔒 Once' : '📦 Stackable'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{addon.description}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{addon.category}</Badge>
                            <span className="font-semibold text-sm whitespace-nowrap">₹{addon.price}/mo</span>
                          </div>
                        </div>
                      ))}
                      {pricing.addons.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No add-ons configured</p>
                          <p className="text-xs">Add-ons are managed in the database</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Add-on Types:</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[9px] px-1.5">🔒 Once</Badge>
                          <span className="text-muted-foreground">Can only be added once per user</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[9px] px-1.5">📦 Stackable</Badge>
                          <span className="text-muted-foreground">Can add multiple quantities</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Save */}
                <div className="flex justify-end pb-6">
                  <Button onClick={savePricing} disabled={isSavingPricing} className="gap-2 w-full sm:w-auto rounded-xl">
                    {isSavingPricing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Pricing Changes
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Settings className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No pricing config found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <div className="h-6" />
    </div>
  );
}
