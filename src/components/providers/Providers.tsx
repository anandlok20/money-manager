'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

interface ProvidersProps {
  children: React.ReactNode;
}

function ColorThemeApplier() {
  const colorTheme = useUIStore((state) => state.colorTheme);
  
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
  
  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000, // 10 minutes - longer cache
            gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Don't refetch on component mount if data exists
            refetchOnReconnect: false, // Don't refetch on reconnect
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
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
