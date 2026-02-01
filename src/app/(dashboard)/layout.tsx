import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

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
