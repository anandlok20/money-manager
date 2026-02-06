import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assets',
  description: 'Track and manage your valuable assets',
};

export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
