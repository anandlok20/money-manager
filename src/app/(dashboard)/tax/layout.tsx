import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tax',
  description: 'Track tax-deductible expenses and documents',
};

export default function TaxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
