'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useUIStore } from '@/stores/uiStore';

// Lazy-load devtools — only included in dev bundles
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((mod) => ({
    default: mod.ReactQueryDevtools,
  }))
);

interface ProvidersProps {
  children: React.ReactNode;
}

function ColorThemeApplier() {
  const colorTheme = useUIStore((state) => state.colorTheme);
  const appMode = useUIStore((state) => state.appMode);
  
  useEffect(() => {
    // Remove all theme classes
    const themeClasses = [
      'stranger-things', 'game-of-thrones', 'fallout', 'red-dead-redemption',
      'barbie', 'batman', 'superman', 'flash', 'ironman', 'thanos', 'joker',
      'baby', 'valentine'
    ];
    document.documentElement.classList.remove(...themeClasses);
    
    // Add the new theme class if not default
    if (colorTheme && colorTheme !== 'default') {
      document.documentElement.classList.add(colorTheme);
    }
  }, [colorTheme]);

  useEffect(() => {
    // Remove all mode classes
    const modeClasses = [
      'mode-anime', 'mode-harry-potter', 'mode-cartoon', 'mode-cyberpunk',
      'mode-retro', 'mode-minimalist', 'mode-nature', 'mode-deva'
    ];
    document.documentElement.classList.remove(...modeClasses);
    
    // Add the new mode class if not default
    if (appMode && appMode !== 'default') {
      document.documentElement.classList.add(`mode-${appMode}`);
    }
  }, [appMode]);
  
  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute - data stays fresh, reduces unnecessary refetches
            gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: 'always', // Always refetch but respects staleTime
            refetchOnReconnect: true, // Refetch when connection is restored
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ColorThemeApplier />
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
        {process.env.NODE_ENV === 'development' && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </SessionProvider>
  );
}
