import type { Metadata } from 'next';
import { requireFeatureAccess } from '@/lib/utils/featureGate';

export const metadata: Metadata = {
  title: 'Investments',
  description: 'Track and manage your investment portfolio',
};

export default async function InvestmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeatureAccess('investments');
  return children;
}
