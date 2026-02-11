import { NextResponse } from 'next/server';
import { getUserSubscription, canAccessFeature, type GatedFeature } from '@/lib/utils/subscription';

/**
 * Check if the user can access a gated feature in an API route.
 * Returns a 403 response if not allowed, or null if access is granted.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: GatedFeature
): Promise<NextResponse | null> {
  const { subscription, pricingConfig } = await getUserSubscription(userId);

  if (!subscription || !pricingConfig) {
    return NextResponse.json(
      {
        success: false,
        error: 'Feature not available',
        message: `The ${feature} feature requires a subscription. Please upgrade your plan.`,
      },
      { status: 403 }
    );
  }

  if (!canAccessFeature(feature, subscription, pricingConfig)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Feature not available',
        message: `The ${feature} feature is not enabled in your current plan. Please upgrade or purchase the add-on.`,
      },
      { status: 403 }
    );
  }

  return null; // Access granted
}
