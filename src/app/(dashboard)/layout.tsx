import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View your financial overview, accounts, and recent transactions',
};

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
