'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Users,
  Crown,
  Shield,
  Loader2,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  RefreshCw,
  Wallet,
  Home,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // Editable pricing fields
  const [editPremiumPrice, setEditPremiumPrice] = useState('');
  const [editFreeLimits, setEditFreeLimits] = useState({ banks: 0, cards: 0, goals: 0, members: 0 });
  const [editPremiumLimits, setEditPremiumLimits] = useState({ banks: 0, cards: 0, goals: 0, members: 0 });

  const fetchUsers = useCallback(async () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Admin Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">
                {session?.user?.name} • Admin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.subscription?.plan === 'premium').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ₹{pricing?.premiumPlanPrice || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Premium Price</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.role === 'admin').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl h-11">
            <TabsTrigger value="users" className="gap-2 rounded-lg">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2 rounded-lg">
              <Settings className="h-4 w-4" /> Pricing
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage users and their subscriptions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchUsers}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Add-ons</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user._id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{user.name}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={user.role === 'admin' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {user.role === 'admin' ? (
                                  <><Shield className="h-3 w-3 mr-1" /> Admin</>
                                ) : (
                                  'User'
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={user.subscription?.plan === 'premium' ? 'default' : 'outline'}
                                className={cn(
                                  'text-xs',
                                  user.subscription?.plan === 'premium' && 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                )}
                              >
                                {user.subscription?.plan === 'premium' ? (
                                  <><Crown className="h-3 w-3 mr-1" /> Premium</>
                                ) : (
                                  'Free'
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {user.subscription?.addons?.length ? (
                                  user.subscription.addons.map((a) => (
                                    <Badge key={a.addonId} variant="outline" className="text-xs">
                                      {a.addonId}
                                      {a.quantity > 1 && ` ×${a.quantity}`}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    Actions <ChevronDown className="h-3 w-3 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {user.subscription?.plan === 'free' ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleUserAction(user._id, 'update-plan', { plan: 'premium' })
                                      }
                                    >
                                      <Crown className="h-4 w-4 mr-2 text-amber-500" />
                                      Upgrade to Premium
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleUserAction(user._id, 'update-plan', { plan: 'free' })
                                      }
                                    >
                                      Downgrade to Free
                                    </DropdownMenuItem>
                                  )}
                                  {user.role === 'user' ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleUserAction(user._id, 'update-role', { role: 'admin' })
                                      }
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      Make Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleUserAction(user._id, 'update-role', { role: 'user' })
                                      }
                                    >
                                      Remove Admin
                                    </DropdownMenuItem>
                                  )}
                                  {pricing?.addons.map((addon) => (
                                    <DropdownMenuItem
                                      key={addon.id}
                                      onClick={() =>
                                        handleUserAction(user._id, 'add-addon', { addonId: addon.id })
                                      }
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add {addon.emoji} {addon.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="mt-6 space-y-6">
            {isLoadingPricing ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pricing ? (
              <>
                {/* Plan Pricing */}
                <Card>
                  <CardHeader>
                    <CardTitle>Plan Pricing</CardTitle>
                    <CardDescription>Set monthly prices for each plan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Free Plan Price</Label>
                        <Input value="₹0" disabled className="bg-muted/30" />
                      </div>
                      <div className="space-y-2">
                        <Label>Premium Plan Price (₹/month)</Label>
                        <Input
                          type="number"
                          value={editPremiumPrice}
                          onChange={(e) => setEditPremiumPrice(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle>Plan Limits</CardTitle>
                    <CardDescription>Set resource limits for each plan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Free Limits */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Badge variant="outline">Free</Badge> Limits
                        </h3>
                        {(['banks', 'cards', 'goals', 'members'] as const).map((key) => (
                          <div key={key} className="flex items-center justify-between">
                            <Label className="capitalize">{key}</Label>
                            <Input
                              type="number"
                              className="w-20 text-center"
                              value={editFreeLimits[key]}
                              onChange={(e) =>
                                setEditFreeLimits((prev) => ({
                                  ...prev,
                                  [key]: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>

                      {/* Premium Limits */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <Crown className="h-3 w-3 mr-1" /> Premium
                          </Badge>
                          Limits
                        </h3>
                        {(['banks', 'cards', 'goals', 'members'] as const).map((key) => (
                          <div key={key} className="flex items-center justify-between">
                            <Label className="capitalize">{key}</Label>
                            <Input
                              type="number"
                              className="w-20 text-center"
                              value={editPremiumLimits[key]}
                              onChange={(e) =>
                                setEditPremiumLimits((prev) => ({
                                  ...prev,
                                  [key]: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add-ons List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add-on Definitions</CardTitle>
                    <CardDescription>Current add-on catalog</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pricing.addons.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{addon.emoji}</span>
                            <div>
                              <p className="font-medium text-sm">{addon.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {addon.description} •{' '}
                                <Badge variant="outline" className="text-xs">
                                  {addon.type}
                                </Badge>
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold text-sm">₹{addon.price}/mo</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button onClick={savePricing} disabled={isSavingPricing} className="gap-2">
                    {isSavingPricing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Pricing Changes
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No pricing config found
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
