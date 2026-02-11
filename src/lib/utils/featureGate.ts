import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getUserSubscription, canAccessFeature, type GatedFeature } from '@/lib/utils/subscription';

/**
 * Server-side feature gate for layout files.
 * Checks if the current user has access to a gated feature.
 * Redirects to settings page if the feature is not enabled.
 */
export async function requireFeatureAccess(feature: GatedFeature): Promise<void> {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Admins bypass feature gates
  if (session.user.role === 'admin') {
    return;
  }

  const { subscription, pricingConfig } = await getUserSubscription(session.user.id);

  if (!subscription || !pricingConfig) {
    redirect('/settings');
  }

  if (!canAccessFeature(feature, subscription, pricingConfig)) {
    redirect('/settings');
  }
}
