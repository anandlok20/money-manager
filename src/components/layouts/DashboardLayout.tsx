'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  CreditCard,
  Building2,
  CalendarClock,
  Plus,
  Tag,
  BarChart3,
  PiggyBank,
  Target,
  Plane,
  FileText,
  Receipt,
  Landmark,
  Car,
  FileUp,
  List,
  LucideIcon,
  ArrowLeft,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NavChild {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  children?: NavChild[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Accounts',
    href: '/accounts',
    icon: Wallet,
    children: [
      { name: 'Banks', href: '/accounts/banks', icon: Building2 },
      { name: 'Cards', href: '/accounts/cards', icon: CreditCard },
    ],
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
    children: [
      { name: 'All Transactions', href: '/transactions', icon: List },
      { name: 'Import', href: '/transactions/import', icon: FileUp },
    ],
  },
  { name: 'Categories', href: '/categories', icon: Tag },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Budgets', href: '/budgets', icon: PiggyBank },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
  { name: 'Trips', href: '/trips', icon: Plane },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Tax', href: '/tax', icon: Receipt },
  { name: 'Assets', href: '/assets', icon: Landmark },
  { name: 'Vehicles', href: '/vehicles', icon: Car },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Scheduled', href: '/scheduled-payments', icon: CalendarClock },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Check if we're on the home page
  const isHomePage = pathname === '/';

  // Get page title from pathname
  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      '/': 'Dashboard',
      '/accounts': 'Accounts',
      '/accounts/banks': 'Bank Accounts',
      '/accounts/cards': 'Cards',
      '/transactions': 'Transactions',
      '/transactions/new': 'New Transaction',
      '/transactions/import': 'Import Transactions',
      '/categories': 'Categories',
      '/reports': 'Reports',
      '/budgets': 'Budgets',
      '/goals': 'Goals',
      '/investments': 'Investments',
      '/trips': 'Trips',
      '/documents': 'Documents',
      '/tax': 'Tax',
      '/assets': 'Assets',
      '/vehicles': 'Vehicles',
      '/members': 'Members',
      '/scheduled-payments': 'Scheduled Payments',
      '/settings': 'Settings',
    };
    // Check for exact match first
    if (titles[pathname]) return titles[pathname];
    // Check for partial matches (for dynamic routes)
    for (const [path, title] of Object.entries(titles)) {
      if (pathname.startsWith(path) && path !== '/') return title;
    }
    return 'Money Manager';
  }, [pathname]);

  const toggleMenu = useCallback((menuName: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const isActive = useCallback((href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }, [pathname]);

  // Render navigation content as JSX directly (not as a function component)
  const renderNavContent = () => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Family Expense Manager</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              const isExpanded = expandedMenus[item.name];
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      'flex items-center justify-between w-full gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              onClick={closeSidebar}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                pathname === child.href
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {child.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Section */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r bg-card lg:block">
        {renderNavContent()}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {renderNavContent()}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background px-4 lg:px-6">
          {/* Mobile Back Button - only show on non-home pages */}
          {!isHomePage && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
          )}

          {/* Mobile Home Button - only show on non-home pages */}
          {!isHomePage && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              asChild
            >
              <Link href="/">
                <Home className="h-5 w-5" />
                <span className="sr-only">Go home</span>
              </Link>
            </Button>
          )}

          {/* Desktop Menu Toggle */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
          </Sheet>

          {/* Page Title - Mobile only */}
          <span className="font-semibold text-sm truncate lg:hidden">{pageTitle}</span>

          <div className="flex-1" />

          {/* Quick Add Button */}
          <Link href="/transactions/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Transaction</span>
            </Button>
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
        <div className="flex items-center justify-around h-16">
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2',
              isActive('/') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            href="/accounts/banks"
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2',
              isActive('/accounts') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-xs">Accounts</span>
          </Link>
          <Link
            href="/transactions/new"
            className="flex flex-col items-center justify-center gap-1 px-3 py-2"
          >
            <div className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg">
              <Plus className="h-6 w-6" />
            </div>
          </Link>
          <Link
            href="/transactions"
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2',
              isActive('/transactions') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <ArrowLeftRight className="h-5 w-5" />
            <span className="text-xs">Transactions</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs">More</span>
          </button>
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
