import type { Metadata } from 'next';
import { requireFeatureAccess } from '@/lib/utils/featureGate';

export const metadata: Metadata = {
  title: 'Vehicles',
  description: 'Track vehicle-related expenses and maintenance',
};

export default async function VehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeatureAccess('vehicles');
  return children;
}
