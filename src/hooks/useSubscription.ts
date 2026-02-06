'use client';

import { useState, useEffect, useCallback } from 'react';

interface SubscriptionData {
  plan: string;
  status: string;
  monthlyCost: number;
  planCost: number;
  addonCost: number;
  limits: {
    banks: number;
    cards: number;
    goals: number;
    members: number;
    investments: boolean;
    reports: boolean;
  };
  activeAddons: { addonId: string; quantity: number }[];
  addonDefinitions: {
    id: string;
    name: string;
    emoji: string;
    description: string;
    price: number;
    type: string;
    category: string;
  }[];
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/subscription');
      const data = await res.json();
      if (data.success) {
        setSubscription(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch subscription');
      }
    } catch {
      setError('Failed to fetch subscription');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const hasAddon = useCallback(
    (addonId: string): boolean => {
      if (!subscription) return false;
      return subscription.activeAddons.some((a) => a.addonId === addonId);
    },
    [subscription]
  );

  const canAccessFeature = useCallback(
    (feature: string): boolean => {
      if (!subscription) return false;

      // Premium-only features
      if (feature === 'investments') return subscription.limits.investments;
      if (feature === 'reports') return subscription.limits.reports;

      // Add-on features
      const addonFeatures = [
        'trips',
        'tax',
        'documents',
        'scheduled-payments',
        'vehicles',
        'god-mode',
        'premium-themes',
      ];
      if (addonFeatures.includes(feature)) {
        return hasAddon(feature);
      }

      return true;
    },
    [subscription, hasAddon]
  );

  const isPremium = subscription?.plan === 'premium';

  return {
    subscription,
    isLoading,
    error,
    hasAddon,
    canAccessFeature,
    isPremium,
    refetch: fetchSubscription,
  };
}
