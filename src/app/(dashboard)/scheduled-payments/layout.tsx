import type { Metadata } from 'next';
import { requireFeatureAccess } from '@/lib/utils/featureGate';

export const metadata: Metadata = {
  title: 'Scheduled Payments',
  description: 'Manage recurring and upcoming scheduled payments',
};

export default async function ScheduledPaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeatureAccess('scheduled-payments');
  return children;
}
