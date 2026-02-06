import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Goals',
  description: 'Set and track your financial savings goals',
};

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
