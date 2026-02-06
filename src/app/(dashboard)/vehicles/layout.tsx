import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vehicles',
  description: 'Track vehicle-related expenses and maintenance',
};

export default function VehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
