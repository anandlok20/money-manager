import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Budgets',
  description: 'Create and track your spending budgets',
};

export default function BudgetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
