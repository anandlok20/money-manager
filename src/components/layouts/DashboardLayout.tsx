'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  List,
  LucideIcon,
  ArrowLeft,
  Home,
  Sparkles,
  Bell,
  Search,
  ChevronLeft,
  Lock,
  Crown,
  Shield,
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
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';

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
  gatedFeature?: string; // Feature ID for subscription gating
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
      { name: 'Assets', href: '/accounts/assets', icon: TrendingUp },
    ],
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
    children: [
      { name: 'All Transactions', href: '/transactions', icon: List },
    ],
  },
  { name: 'Categories', href: '/categories', icon: Tag },
  { name: 'Reports', href: '/reports', icon: BarChart3, gatedFeature: 'reports' },
  { name: 'Budgets', href: '/budgets', icon: PiggyBank },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Trips', href: '/trips', icon: Plane, gatedFeature: 'trips' },
  { name: 'Documents', href: '/documents', icon: FileText, gatedFeature: 'documents' },
  { name: 'Tax', href: '/tax', icon: Receipt, gatedFeature: 'tax' },
  { name: 'Vehicles', href: '/vehicles', icon: Car, gatedFeature: 'vehicles' },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Scheduled', href: '/scheduled-payments', icon: CalendarClock, gatedFeature: 'scheduled-payments' },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const { canAccessFeature } = useSubscription();

  const isAdmin = session?.user?.role === 'admin';

  // Check if we're on the home page
  const isHomePage = pathname === '/';

  // Get page title from pathname
  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      '/': 'Dashboard',
      '/accounts': 'Accounts',
      '/accounts/banks': 'Bank Accounts',
      '/accounts/cards': 'Cards',
      '/accounts/assets': 'Assets & Investments',
      '/transactions': 'Transactions',
      '/transactions/new': 'New Transaction',
      '/categories': 'Categories',
      '/reports': 'Reports',
      '/budgets': 'Budgets',
      '/goals': 'Goals',
      '/trips': 'Trips',
      '/documents': 'Documents',
      '/tax': 'Tax',
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
  const renderNavContent = (collapsed = false) => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-border/50 transition-all duration-300",
        collapsed ? "px-3 justify-center" : "px-4"
      )}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base leading-tight">Family Expense</span>
              <span className="text-xs text-muted-foreground">Manager</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            if (item.children && !collapsed) {
              const isExpanded = expandedMenus[item.name];
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      'flex items-center justify-between w-full gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isActive(item.href) ? "bg-primary/20" : "bg-muted/50"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {item.name}
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>
                  <div className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
                  )}>
                    <ul className="overflow-hidden ml-4 space-y-0.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              onClick={closeSidebar}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                                pathname === child.href
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:translate-x-1'
                              )}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {child.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            }

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={closeSidebar}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    collapsed && 'justify-center px-2',
                    item.gatedFeature && !canAccessFeature(item.gatedFeature) && 'opacity-60'
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    isActive(item.href) ? "bg-primary/20" : "bg-muted/50"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {!collapsed && (
                    <span className="flex items-center gap-2 flex-1">
                      {item.name}
                      {item.gatedFeature && !canAccessFeature(item.gatedFeature) && (
                        <Lock className="h-3 w-3 text-muted-foreground ml-auto" />
                      )}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          {/* Admin Link */}
          {isAdmin && !collapsed && (
            <li>
              <Link
                href="/admin"
                onClick={closeSidebar}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
                  <Shield className="h-4 w-4" />
                </div>
                Admin Panel
              </Link>
            </li>
          )}
        </ul>
      </div>

      {/* User Section */}
      <div className="border-t border-border/50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              type="button" 
              className={cn(
                "flex items-center gap-3 w-full rounded-xl p-2.5 hover:bg-muted/60 transition-all duration-200 group",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="h-9 w-9 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session?.user?.email}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-destructive focus:text-destructive gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen border-r border-border/50 bg-card/80 backdrop-blur-xl lg:block transition-all duration-300",
        sidebarCollapsed ? "w-[72px]" : "w-64"
      )}>
        {renderNavContent(sidebarCollapsed)}
        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border/50 shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronLeft className={cn("h-3 w-3 transition-transform", sidebarCollapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-card/95 backdrop-blur-xl border-r-0">
          {renderNavContent()}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
            {/* Mobile Back Button - only show on non-home pages */}
            {!isHomePage && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-xl hover:bg-muted/60"
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
                className="lg:hidden rounded-xl hover:bg-muted/60"
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
                <Button variant="ghost" size="icon" className="lg:hidden rounded-xl hover:bg-muted/60">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
            </Sheet>

            {/* Page Title */}
            <div className="hidden lg:flex items-center gap-2">
              <h1 className="text-lg font-semibold">{pageTitle}</h1>
            </div>
            <span className="font-semibold text-sm truncate lg:hidden">{pageTitle}</span>

            <div className="flex-1" />

            {/* Quick Add Button */}
            <Link href="/transactions/new">
              <Button size="sm" className="gap-2 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Transaction</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content - Full Width */}
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-8">
          <div className="w-full max-w-[1800px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-xl lg:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
              isActive('/') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link
            href="/accounts/banks"
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
              isActive('/accounts') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[10px] font-medium">Accounts</span>
          </Link>
          
          {/* Floating Add Button */}
          <Link
            href="/transactions/new"
            className="relative -mt-8"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-200">
              <Plus className="h-7 w-7" />
            </div>
          </Link>
          
          <Link
            href="/transactions"
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
              isActive('/transactions') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowLeftRight className="h-5 w-5" />
            <span className="text-[10px] font-medium">Transactions</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
