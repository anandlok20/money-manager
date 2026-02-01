'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to the new Assets section under Accounts
export default function InvestmentsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/accounts/assets');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Redirecting to Assets...</p>
    </div>
  );
}
