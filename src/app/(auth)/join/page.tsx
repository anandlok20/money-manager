'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, KeyRound, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type Step = 'code' | 'setup' | 'login';

interface CodeInfo {
  name: string;
  setupComplete: boolean;
  code: string;
}

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('code');
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: code entry
  const [code, setCode] = useState('');

  // Step 2: first-time setup
  const [setupName, setSetupName] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [showSetupPass, setShowSetupPass] = useState(false);

  // Step 3: returning login
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  async function handleValidateCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Invalid access code');
        return;
      }
      setCodeInfo({ name: data.name, setupComplete: data.setupComplete, code: code.trim().toUpperCase() });
      setSetupName(data.name || '');
      setStep(data.setupComplete ? 'login' : 'setup');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!codeInfo) return;
    if (setupPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (setupPassword !== setupConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/member-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInfo.code, name: setupName.trim(), password: setupPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Setup failed');
        return;
      }
      // Auto sign-in
      const result = await signIn('credentials', {
        accessCode: codeInfo.code,
        password: setupPassword,
        redirect: false,
      });
      if (result?.error) {
        toast.error('Setup complete but sign-in failed. Please try logging in.');
        router.push('/join');
      } else {
        toast.success(`Welcome, ${setupName || codeInfo.name}!`);
        router.push('/');
        router.refresh();
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestReset() {
    if (!codeInfo) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInfo.code }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to request reset'); return; }
      setResetRequested(true);
      toast.success('Reset requested! Ask your family admin to reset your password.');
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!codeInfo) return;
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        accessCode: codeInfo.code,
        password: loginPassword,
        redirect: false,
      });
      if (result?.error) {
        toast.error('Invalid password');
      } else {
        toast.success(`Welcome back, ${codeInfo.name}!`);
        router.push('/');
        router.refresh();
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-2">
          <div className="rounded-full bg-primary/10 p-3">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          {step === 'code' && 'Join with Access Code'}
          {step === 'setup' && 'Set Up Your Account'}
          {step === 'login' && `Welcome back, ${codeInfo?.name}`}
        </CardTitle>
        <CardDescription className="text-center">
          {step === 'code' && 'Enter the access code shared by your family member'}
          {step === 'setup' && 'Create a password to secure your account'}
          {step === 'login' && 'Enter your password to sign in'}
        </CardDescription>
      </CardHeader>

      {step === 'code' && (
        <form onSubmit={handleValidateCode}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Access Code</Label>
              <Input
                id="code"
                placeholder="e.g. A1B2C3D4"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoComplete="off"
                disabled={isLoading}
                className="text-center tracking-widest text-lg font-mono uppercase"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || !code.trim()}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Continue
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      )}

      {step === 'setup' && (
        <form onSubmit={handleSetup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-name">Your Name</Label>
              <Input
                id="setup-name"
                placeholder="Your name"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password">Password</Label>
              <div className="relative">
                <Input
                  id="setup-password"
                  type={showSetupPass ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowSetupPass(!showSetupPass)}
                >
                  {showSetupPass ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-confirm">Confirm Password</Label>
              <Input
                id="setup-confirm"
                type="password"
                placeholder="Repeat your password"
                value={setupConfirm}
                onChange={(e) => setSetupConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || !setupPassword || !setupConfirm}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account & Sign In
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => { setStep('code'); setCodeInfo(null); }}
              disabled={isLoading}
            >
              Use a different code
            </Button>
          </CardFooter>
        </form>
      )}

      {step === 'login' && (
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showLoginPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                >
                  {showLoginPass ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || !loginPassword}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            {resetRequested ? (
              <p className="text-xs text-center text-muted-foreground">
                Reset requested. Your family admin will reset your password.
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={handleRequestReset}
                disabled={isLoading}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Forgot password? Request reset
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => { setStep('code'); setCodeInfo(null); setLoginPassword(''); setResetRequested(false); }}
              disabled={isLoading}
            >
              Use a different code
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
