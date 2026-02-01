'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  currency: string;
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      currency: 'INR',
      sidebarOpen: true,
      mobileNavOpen: false,

      setTheme: (theme) => set({ theme }),

      setCurrency: (currency) => set({ currency }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleMobileNav: () =>
        set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),

      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        currency: state.currency,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
