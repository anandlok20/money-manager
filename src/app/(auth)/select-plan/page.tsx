'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Check,
  Crown,
  Zap,
  Loader2,
  Sparkles,
  Building2,
  CreditCard,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  Plus,
  Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
  freePlanPrice: number;
  premiumPlanPrice: number;
  freeLimits: {
    banks: number;
    cards: number;
    goals: number;
    members: number;
    investments: boolean;
    reports: boolean;
  };
  premiumLimits: {
    banks: number;
    cards: number;
    goals: number;
    members: number;
    investments: boolean;
    reports: boolean;
  };
  addons: AddonDef[];
}

export default function SelectPlanPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('free');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    // If user already selected a plan, redirect to dashboard
    if (session?.user?.hasSelectedPlan) {
      router.push('/');
      return;
    }

    // Fetch pricing config
    fetch('/api/subscription')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.pricing) {
          setPricing({
            ...data.data.pricing,
            addons: data.data.addonDefinitions || [],
          });
        }
      })
      .catch(() => {
        // If no subscription yet, fetch pricing from a simple endpoint
        // fallback — hard-code defaults
        setPricing({
          freePlanPrice: 0,
          premiumPlanPrice: 199,
          freeLimits: { banks: 2, cards: 3, goals: 3, members: 2, investments: false, reports: false },
          premiumLimits: { banks: 4, cards: 6, goals: 5, members: 5, investments: true, reports: true },
          addons: [],
        });
      })
      .finally(() => setIsFetching(false));
  }, [session, router]);

  const toggleAddon = (addonId: string, type: 'feature' | 'stackable') => {
    setSelectedAddons((prev) => {
      const current = prev[addonId] || 0;
      if (type === 'feature') {
        return { ...prev, [addonId]: current > 0 ? 0 : 1 };
      }
      return prev;
    });
  };

  const adjustStackable = (addonId: string, delta: number) => {
    setSelectedAddons((prev) => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [addonId]: next };
    });
  };

  const totalMonthlyCost = () => {
    if (!pricing) return 0;
    const planCost = selectedPlan === 'premium' ? pricing.premiumPlanPrice : 0;
    const addonCost = Object.entries(selectedAddons).reduce((total, [id, qty]) => {
      if (qty <= 0) return total;
      const def = pricing.addons.find((a) => a.id === id);
      return total + (def ? def.price * qty : 0);
    }, 0);
    return planCost + addonCost;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // 1. Select plan
      const planRes = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!planRes.ok) {
        const err = await planRes.json();
        throw new Error(err.error || 'Failed to select plan');
      }

      // 2. Add selected addons
      for (const [addonId, qty] of Object.entries(selectedAddons)) {
        if (qty <= 0) continue;
        await fetch('/api/subscription', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-addon',
            addonId,
            quantity: qty,
          }),
        });
      }

      // 3. Update session
      await update({ hasSelectedPlan: true });

      toast.success('Plan activated!', {
        description: selectedPlan === 'premium'
          ? 'Welcome to Premium! 🎉'
          : 'Free plan activated. Upgrade anytime!',
      });

      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to activate plan');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const limits = selectedPlan === 'premium' ? pricing?.premiumLimits : pricing?.freeLimits;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        </div>
        <p className="text-muted-foreground">
          Start with Free or go Premium. Add features as you need them.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <Card
          className={cn(
            'relative cursor-pointer transition-all duration-300 hover:shadow-lg',
            selectedPlan === 'free'
              ? 'border-primary shadow-lg ring-2 ring-primary/20'
              : 'border-border/50 hover:border-primary/40'
          )}
          onClick={() => setSelectedPlan('free')}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-500" />
                Free
              </CardTitle>
              {selectedPlan === 'free' && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">₹0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{pricing?.freeLimits.banks} Bank Accounts</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{pricing?.freeLimits.cards} Cards</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>{pricing?.freeLimits.goals} Goals</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{pricing?.freeLimits.members} Members</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="line-through">Investments</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span className="line-through">Reports</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card
          className={cn(
            'relative cursor-pointer transition-all duration-300 hover:shadow-lg',
            selectedPlan === 'premium'
              ? 'border-primary shadow-lg ring-2 ring-primary/20'
              : 'border-border/50 hover:border-primary/40'
          )}
          onClick={() => setSelectedPlan('premium')}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1">
              <Crown className="h-3 w-3 mr-1" /> Recommended
            </Badge>
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Premium
              </CardTitle>
              {selectedPlan === 'premium' && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">₹{pricing?.premiumPlanPrice}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{pricing?.premiumLimits.banks} Bank Accounts</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-medium">{pricing?.premiumLimits.cards} Cards</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium">{pricing?.premiumLimits.goals} Goals</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">{pricing?.premiumLimits.members} Members</span>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">✓ Investments</span>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <BarChart3 className="h-4 w-4" />
                <span className="font-medium">✓ Reports</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add-ons */}
      {pricing && pricing.addons.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">Supercharge with Add-ons</h2>
              <p className="text-sm text-muted-foreground">
                Pick only what you need — works with any plan
              </p>
            </div>

            {/* Group by category */}
            {['modules', 'experience', 'limits'].map((category) => {
              const categoryAddons = pricing.addons.filter((a) => a.category === category);
              if (categoryAddons.length === 0) return null;

              const categoryLabels: Record<string, string> = {
                modules: '📦 Feature Modules',
                experience: '✨ Experience',
                limits: '📊 Extra Capacity',
              };

              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoryAddons.map((addon) => {
                      const qty = selectedAddons[addon.id] || 0;
                      const isActive = qty > 0;

                      return (
                        <div
                          key={addon.id}
                          className={cn(
                            'flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer',
                            isActive
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border/50 hover:border-primary/30'
                          )}
                          onClick={() => {
                            if (addon.type === 'feature') toggleAddon(addon.id, addon.type);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{addon.emoji}</span>
                            <div>
                              <p className="font-medium text-sm">{addon.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {addon.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {addon.type === 'stackable' ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    adjustStackable(addon.id, -1);
                                  }}
                                  disabled={qty <= 0}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium w-6 text-center">{qty}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    adjustStackable(addon.id, 1);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              isActive && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )
                            )}
                            <span className="text-sm font-semibold text-primary min-w-[60px] text-right">
                              ₹{addon.price}
                              {addon.type === 'stackable' ? '/ea' : '/mo'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Summary & CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Monthly total</p>
              <p className="text-3xl font-bold">
                ₹{totalMonthlyCost()}
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedPlan === 'free' ? 'Free plan' : 'Premium plan'}
                {Object.values(selectedAddons).some((v) => v > 0) && ' + add-ons'}
              </p>
            </div>
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 text-base px-8 rounded-xl"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {isLoading ? 'Activating...' : 'Get Started'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skip option */}
      <div className="text-center pb-8">
        <button
          onClick={() => handleSubmit()}
          className="text-sm text-muted-foreground hover:text-foreground underline"
          disabled={isLoading}
        >
          Skip for now (start with Free plan)
        </button>
      </div>
    </div>
  );
}
