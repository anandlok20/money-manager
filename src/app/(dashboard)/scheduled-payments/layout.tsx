import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scheduled Payments',
  description: 'Manage recurring and upcoming scheduled payments',
};

export default function ScheduledPaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
