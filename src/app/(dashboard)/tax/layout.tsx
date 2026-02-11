import type { Metadata } from 'next';
import { requireFeatureAccess } from '@/lib/utils/featureGate';

export const metadata: Metadata = {
  title: 'Tax',
  description: 'Track tax-deductible expenses and documents',
};

export default async function TaxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeatureAccess('tax');
  return children;
}
