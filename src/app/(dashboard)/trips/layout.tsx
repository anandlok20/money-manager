import type { Metadata } from 'next';
import { requireFeatureAccess } from '@/lib/utils/featureGate';

export const metadata: Metadata = {
  title: 'Trips',
  description: 'Manage travel expenses and trip budgets',
};

export default async function TripsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeatureAccess('trips');
  return children;
}
