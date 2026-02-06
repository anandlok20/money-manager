import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investments',
  description: 'Track and manage your investment portfolio',
};

export default function InvestmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
