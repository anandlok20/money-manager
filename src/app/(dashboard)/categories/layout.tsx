import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Organize transactions with custom income and expense categories',
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
