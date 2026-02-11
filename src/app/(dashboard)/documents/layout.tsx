import type { Metadata } from 'next';
import { requireFeatureAccess } from '@/lib/utils/featureGate';

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Store and organize financial documents',
};

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeatureAccess('documents');
  return children;
}
