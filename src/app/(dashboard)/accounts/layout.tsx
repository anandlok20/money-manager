import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accounts',
  description: 'Manage your bank accounts and credit cards',
};

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
