import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trips',
  description: 'Manage travel expenses and trip budgets',
};

export default function TripsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
