'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

// Available color themes
export const colorThemes = [
  { id: 'default', name: 'Default', emoji: '⚪' },
  { id: 'stranger-things', name: 'Stranger Things', emoji: '👾' },
  { id: 'game-of-thrones', name: 'Game of Thrones', emoji: '⚔️' },
  { id: 'fallout', name: 'Fallout', emoji: '☢️' },
  { id: 'red-dead-redemption', name: 'Red Dead Redemption', emoji: '🤠' },
  { id: 'barbie', name: 'Barbie', emoji: '💖' },
  { id: 'batman', name: 'Batman', emoji: '🦇' },
  { id: 'superman', name: 'Superman', emoji: '🦸' },
  { id: 'flash', name: 'Flash', emoji: '⚡' },
  { id: 'ironman', name: 'Iron Man', emoji: '🤖' },
  { id: 'thanos', name: 'Thanos', emoji: '💎' },
  { id: 'joker', name: 'Joker', emoji: '🃏' },
  { id: 'baby', name: 'Baby Mode', emoji: '👶' },
  { id: 'valentine', name: 'Valentine', emoji: '💝' },
];

interface UIState {
  theme: Theme;
  colorTheme: string;
  currency: string;
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: string) => void;
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
      colorTheme: 'default',
      currency: 'INR',
      sidebarOpen: true,
      mobileNavOpen: false,

      setTheme: (theme) => set({ theme }),
      
      setColorTheme: (colorTheme) => set({ colorTheme }),

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
        colorTheme: state.colorTheme,
        currency: state.currency,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
