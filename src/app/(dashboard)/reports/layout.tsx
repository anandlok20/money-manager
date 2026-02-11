import type { Metadata } from 'next';
import { requireFeatureAccess } from '@/lib/utils/featureGate';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'View financial reports and analytics',
};

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeatureAccess('reports');
  return children;
}
