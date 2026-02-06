import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transactions',
  description: 'View and manage your income and expense transactions',
};

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
