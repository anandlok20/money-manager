'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Users,
  Settings,
  Plus,
  Tag,
  BarChart3,
  PiggyBank,
  Target,
  Plane,
  FileText,
  Receipt,
  Car,
  CalendarClock,
  Building2,
  CreditCard,
  Search,
  Shield,
} from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/uiStore';
import { useSession } from 'next-auth/react';
import { useSubscription } from '@/hooks/useSubscription';

interface CommandItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  keywords: string[];
  group: string;
  gatedFeature?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const appMode = useUIStore((state) => state.appMode);
  const { data: session } = useSession();
  const { canAccessFeature } = useSubscription();

  // ⌘K or Ctrl+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      // Navigation
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, href: '/', keywords: ['home', 'overview'], group: 'Navigation' },
      { label: 'Bank Accounts', icon: <Building2 className="h-4 w-4" />, href: '/accounts/banks', keywords: ['bank', 'account'], group: 'Navigation' },
      { label: 'Cards', icon: <CreditCard className="h-4 w-4" />, href: '/accounts/cards', keywords: ['card', 'credit', 'debit'], group: 'Navigation' },
      { label: 'Transactions', icon: <ArrowLeftRight className="h-4 w-4" />, href: '/transactions', keywords: ['transaction', 'payment'], group: 'Navigation' },
      { label: 'Categories', icon: <Tag className="h-4 w-4" />, href: '/categories', keywords: ['category', 'tag'], group: 'Navigation' },
      { label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, href: '/reports', keywords: ['report', 'analytics'], group: 'Navigation', gatedFeature: 'reports' },
      { label: 'Budgets', icon: <PiggyBank className="h-4 w-4" />, href: '/budgets', keywords: ['budget'], group: 'Navigation' },
      { label: 'Goals', icon: <Target className="h-4 w-4" />, href: '/goals', keywords: ['goal', 'savings'], group: 'Navigation' },
      { label: 'Trips', icon: <Plane className="h-4 w-4" />, href: '/trips', keywords: ['trip', 'travel'], group: 'Navigation', gatedFeature: 'trips' },
      { label: 'Documents', icon: <FileText className="h-4 w-4" />, href: '/documents', keywords: ['document', 'file'], group: 'Navigation', gatedFeature: 'documents' },
      { label: 'Tax', icon: <Receipt className="h-4 w-4" />, href: '/tax', keywords: ['tax', 'deduction'], group: 'Navigation', gatedFeature: 'tax' },
      { label: 'Vehicles', icon: <Car className="h-4 w-4" />, href: '/vehicles', keywords: ['vehicle', 'car'], group: 'Navigation', gatedFeature: 'vehicles' },
      { label: 'Members', icon: <Users className="h-4 w-4" />, href: '/members', keywords: ['member', 'family'], group: 'Navigation' },
      { label: 'Scheduled Payments', icon: <CalendarClock className="h-4 w-4" />, href: '/scheduled-payments', keywords: ['scheduled', 'recurring'], group: 'Navigation', gatedFeature: 'scheduled-payments' },
      { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings', keywords: ['settings', 'preferences'], group: 'Navigation' },

      // Quick Actions
      { label: 'New Transaction', icon: <Plus className="h-4 w-4" />, href: '/transactions/new', keywords: ['new', 'add', 'create', 'transaction'], group: 'Quick Actions' },
      { label: 'New Member', icon: <Plus className="h-4 w-4" />, href: '/members/new', keywords: ['new', 'add', 'member'], group: 'Quick Actions' },
    ];

    // Admin link
    if (session?.user?.role === 'admin') {
      items.push({
        label: 'Admin Panel',
        icon: <Shield className="h-4 w-4" />,
        href: '/admin',
        keywords: ['admin', 'manage', 'users'],
        group: 'Admin',
      });
    }

    // Filter out locked/gated features
    return items.filter(
      (item) => !item.gatedFeature || canAccessFeature(item.gatedFeature)
    );
  }, [session, canAccessFeature]);

  const runCommand = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const cmd of commands) {
      const group = map.get(cmd.group) || [];
      group.push(cmd);
      map.set(cmd.group, group);
    }
    return map;
  }, [commands]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={
          appMode === 'deva'
            ? '🔱 देव Command — search anything...'
            : 'Type a command or search...'
        }
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Array.from(groups.entries()).map(([groupName, items], idx) => (
          <div key={groupName}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={groupName}>
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => runCommand(item.href)}
                  keywords={item.keywords}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
