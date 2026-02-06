import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Members',
  description: 'Manage family members for tracking shared expenses',
};

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
