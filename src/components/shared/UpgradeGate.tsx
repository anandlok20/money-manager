'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpgradeGateProps {
  feature: string;
  featureLabel: string;
  hasAccess: boolean;
  children: React.ReactNode;
  type?: 'addon' | 'premium';
  addonPrice?: number;
}

export function UpgradeGate({
  feature,
  featureLabel,
  hasAccess,
  children,
  type = 'addon',
  addonPrice,
}: UpgradeGateProps) {
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className="relative cursor-pointer"
        onClick={() => setShowDialog(true)}
        data-feature={feature}
      >
        <div className="pointer-events-none opacity-50 blur-[1px]" inert>
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
          <div className="text-center space-y-2 p-4">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">
              {featureLabel} is locked
            </p>
            <p className="text-xs text-muted-foreground">
              {type === 'premium'
                ? 'Upgrade to Premium to unlock'
                : `Add the ${featureLabel} add-on${addonPrice ? ` (₹${addonPrice}/mo)` : ''}`}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {type === 'premium' ? (
                <Crown className="h-5 w-5 text-amber-500" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
              Unlock {featureLabel}
            </DialogTitle>
            <DialogDescription>
              {type === 'premium'
                ? `${featureLabel} is available on the Premium plan. Upgrade to access this feature.`
                : `Add the ${featureLabel} add-on to your plan${addonPrice ? ` for just ₹${addonPrice}/month` : ''}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                setShowDialog(false);
                router.push('/settings');
              }}
            >
              Go to Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
