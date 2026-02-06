import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Store and organize financial documents',
};

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
