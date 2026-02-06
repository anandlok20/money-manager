import { connectToDatabase } from '@/lib/mongodb/client';
import Subscription from '@/lib/mongodb/models/Subscription';
import PricingConfig from '@/lib/mongodb/models/PricingConfig';
import type { ISubscription } from '@/lib/mongodb/models/Subscription';
import type { IPricingConfig, IPlanLimits } from '@/lib/mongodb/models/PricingConfig';

export type GatedFeature =
  | 'investments'
  | 'reports'
  | 'trips'
  | 'tax'
  | 'documents'
  | 'scheduled-payments'
  | 'vehicles'
  | 'god-mode'
  | 'premium-themes';

export type LimitedResource = 'banks' | 'cards' | 'goals' | 'members';

/**
 * Get user's subscription + active pricing config
 */
export async function getUserSubscription(userId: string) {
  await connectToDatabase();

  const [subscription, pricingConfig] = await Promise.all([
    Subscription.findOne({ userId, status: 'active' }).lean<ISubscription>(),
    PricingConfig.findOne({ isActive: true }).lean<IPricingConfig>(),
  ]);

  return { subscription, pricingConfig };
}

/**
 * Get the effective limits for a user based on their plan + stackable add-ons
 */
export function getEffectiveLimits(
  subscription: ISubscription,
  pricingConfig: IPricingConfig
): IPlanLimits {
  const baseLimits =
    subscription.plan === 'premium'
      ? { ...pricingConfig.premiumLimits }
      : { ...pricingConfig.freeLimits };

  // Apply stackable add-ons
  for (const addon of subscription.addons) {
    if (addon.addonId === 'extra-member') {
      baseLimits.members += addon.quantity;
    } else if (addon.addonId === 'extra-bank') {
      baseLimits.banks += addon.quantity;
    } else if (addon.addonId === 'extra-card') {
      baseLimits.cards += addon.quantity;
    }
  }

  return baseLimits;
}

/**
 * Check if a user can access a gated feature
 */
export function canAccessFeature(
  feature: GatedFeature,
  subscription: ISubscription,
  pricingConfig: IPricingConfig
): boolean {
  const limits =
    subscription.plan === 'premium'
      ? pricingConfig.premiumLimits
      : pricingConfig.freeLimits;

  // Features available in premium plan
  if (feature === 'investments') return limits.investments;
  if (feature === 'reports') return limits.reports;

  // Features that require add-ons (regardless of plan)
  const addonFeatures: GatedFeature[] = [
    'trips',
    'tax',
    'documents',
    'scheduled-payments',
    'vehicles',
    'god-mode',
    'premium-themes',
  ];

  if (addonFeatures.includes(feature)) {
    return subscription.addons.some((a) => a.addonId === feature);
  }

  return false;
}

/**
 * Check if a user can create one more of a limited resource
 */
export async function canCreateResource(
  userId: string,
  resource: LimitedResource,
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number; message?: string }> {
  const { subscription, pricingConfig } = await getUserSubscription(userId);

  if (!subscription || !pricingConfig) {
    return { allowed: false, limit: 0, current: currentCount, message: 'No active subscription found' };
  }

  const limits = getEffectiveLimits(subscription, pricingConfig);
  const limit = limits[resource];

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      current: currentCount,
      message: `You've reached your ${resource} limit (${limit}). Upgrade your plan or add an extra ${resource.slice(0, -1)} add-on.`,
    };
  }

  return { allowed: true, limit, current: currentCount };
}

/**
 * Check if a color theme is accessible to the user
 */
export function canAccessTheme(
  themeId: string,
  subscription: ISubscription,
  pricingConfig: IPricingConfig
): boolean {
  // Default theme always accessible
  if (themeId === 'default') return true;

  // Free themes always accessible
  const freeThemes =
    subscription.plan === 'premium'
      ? pricingConfig.premiumLimits.freeThemes
      : pricingConfig.freeLimits.freeThemes;

  if (freeThemes.includes(themeId)) return true;

  // Premium themes add-on unlocks all themes
  if (subscription.addons.some((a) => a.addonId === 'premium-themes')) return true;

  return false;
}

/**
 * Get a summary of user's subscription for frontend display
 */
export async function getSubscriptionSummary(userId: string) {
  const { subscription, pricingConfig } = await getUserSubscription(userId);

  if (!subscription || !pricingConfig) {
    return null;
  }

  const limits = getEffectiveLimits(subscription, pricingConfig);
  const activeAddonIds = subscription.addons.map((a) => a.addonId);
  const activeAddons = pricingConfig.addons.filter((def) =>
    activeAddonIds.includes(def.id)
  );

  // Calculate monthly cost
  const planCost =
    subscription.plan === 'premium' ? pricingConfig.premiumPlanPrice : 0;
  const addonCost = subscription.addons.reduce((total, userAddon) => {
    const def = pricingConfig.addons.find((a) => a.id === userAddon.addonId);
    return total + (def ? def.price * userAddon.quantity : 0);
  }, 0);

  return {
    plan: subscription.plan,
    status: subscription.status,
    limits,
    activeAddons: subscription.addons,
    addonDefinitions: pricingConfig.addons,
    activeAddonDetails: activeAddons,
    monthlyCost: planCost + addonCost,
    planCost,
    addonCost,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    pricing: {
      free: pricingConfig.freePlanPrice,
      premium: pricingConfig.premiumPlanPrice,
      freeLimits: pricingConfig.freeLimits,
      premiumLimits: pricingConfig.premiumLimits,
    },
  };
}
