'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Check, X, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SensitivePasswordDialogProps {
  onVerified?: (token: string) => void;
  trigger?: React.ReactNode;
}

export function SensitivePasswordDialog({ onVerified, trigger }: SensitivePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch('/api/settings/sensitive-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');
      return data.data;
    },
    onSuccess: (data) => {
      setOpen(false);
      setPassword('');
      onVerified?.(data.token);
      toast.success('Access granted for 5 minutes');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 1) {
      toast.error('Please enter your password');
      return;
    }
    verifyMutation.mutate(password);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Lock className="h-4 w-4" />
            View Sensitive Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Enter Security Password</DialogTitle>
              <DialogDescription>
                Enter your sensitive data password to view CVV, PIN, and other protected information.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleVerify}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sensitivePassword">Password</Label>
              <div className="relative">
                <Input
                  id="sensitivePassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  className="pr-10"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? 'Verifying...' : 'Unlock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface SetSensitivePasswordDialogProps {
  isUpdate?: boolean;
  trigger?: React.ReactNode;
}

export function SetSensitivePasswordDialog({ isUpdate = false, trigger }: SetSensitivePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const setPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch('/api/settings/sensitive-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to set password');
      return data;
    },
    onSuccess: () => {
      setOpen(false);
      setPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['sensitive-password-status'] });
      toast.success(isUpdate ? 'Security password updated' : 'Security password set successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordMutation.mutate(password);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={isUpdate ? 'outline' : 'default'} className="gap-2">
            <Lock className="h-4 w-4" />
            {isUpdate ? 'Change Password' : 'Set Password'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{isUpdate ? 'Update' : 'Set'} Security Password</DialogTitle>
              <DialogDescription>
                This password protects sensitive data like CVV and PIN numbers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a password (min 4 characters)"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" /> Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && password.length >= 4 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={setPasswordMutation.isPending || password !== confirmPassword || password.length < 4}
            >
              {setPasswordMutation.isPending ? 'Saving...' : 'Save Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage sensitive data access
export function useSensitiveDataAccess() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  // Store current time as state to make Date.now() calls pure (state updates)
  // Initialize with a reasonable default - will be corrected by interval
  const [currentTime, setCurrentTime] = useState(0);

  // Set up interval to update current time periodically
  useEffect(() => {
    // Use requestAnimationFrame for initial time update to avoid sync setState
    const rafId = requestAnimationFrame(() => {
      setCurrentTime(Date.now());
    });
    
    // Only set up polling interval if we have an expiry to track
    if (!expiresAt) {
      return () => cancelAnimationFrame(rafId);
    }
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(interval);
    };
  }, [expiresAt]);

  const { data: passwordStatus } = useQuery({
    queryKey: ['sensitive-password-status'],
    queryFn: async () => {
      const response = await fetch('/api/settings/sensitive-password');
      if (!response.ok) throw new Error('Failed to check status');
      const data = await response.json();
      return data.data;
    },
  });

  const isPasswordSet = passwordStatus?.isSet ?? false;
  
  // Compute hasAccess based on stored currentTime (pure computation)
  const hasAccess = !!(accessToken && expiresAt && currentTime > 0 && currentTime < expiresAt);

  const grantAccess = (token: string) => {
    // Token format: base64(userId:expiresAt)
    try {
      const decoded = atob(token);
      const [, expiry] = decoded.split(':');
      const expiryTime = parseInt(expiry, 10);
      setAccessToken(token);
      setExpiresAt(expiryTime);
      // Schedule time update for next frame
      requestAnimationFrame(() => setCurrentTime(Date.now()));
    } catch {
      toast.error('Invalid access token');
    }
  };

  const revokeAccess = () => {
    setAccessToken(null);
    setExpiresAt(null);
  };

  return {
    isPasswordSet,
    hasAccess,
    accessToken,
    expiresAt,
    grantAccess,
    revokeAccess,
  };
}
