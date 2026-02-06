'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

// Available app modes - each transforms the entire look and feel
export const appModes = [
  {
    id: 'default',
    name: 'Default',
    emoji: '✨',
    description: 'Clean, modern design',
    font: 'Inter',
    preview: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900',
  },
  {
    id: 'anime',
    name: 'Anime',
    emoji: '🌸',
    description: 'Japanese anime inspired',
    font: 'Nunito',
    preview: 'bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200',
  },
  {
    id: 'harry-potter',
    name: 'Harry Potter',
    emoji: '⚡',
    description: 'Magical wizarding world',
    font: 'Crimson Text',
    preview: 'bg-gradient-to-br from-amber-900 via-yellow-800 to-amber-700',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    emoji: '🎨',
    description: 'Fun, bubbly cartoon style',
    font: 'Baloo 2',
    preview: 'bg-gradient-to-br from-yellow-300 via-green-300 to-cyan-300',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    emoji: '🤖',
    description: 'Futuristic neon cyber world',
    font: 'Orbitron',
    preview: 'bg-gradient-to-br from-fuchsia-600 via-cyan-500 to-yellow-400',
  },
  {
    id: 'retro',
    name: 'Retro',
    emoji: '📺',
    description: '80s/90s retro vibes',
    font: 'Press Start 2P',
    preview: 'bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    emoji: '◻️',
    description: 'Ultra-clean, less is more',
    font: 'IBM Plex Sans',
    preview: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black',
  },
  {
    id: 'nature',
    name: 'Nature',
    emoji: '🌿',
    description: 'Earthy, organic feel',
    font: 'Merriweather',
    preview: 'bg-gradient-to-br from-green-700 via-emerald-600 to-teal-500',
  },
];

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
  appMode: string;
  currency: string;
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: string) => void;
  setAppMode: (mode: string) => void;
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
      appMode: 'default',
      currency: 'INR',
      sidebarOpen: true,
      mobileNavOpen: false,

      setTheme: (theme) => set({ theme }),
      
      setColorTheme: (colorTheme) => set({ colorTheme }),

      setAppMode: (appMode) => set({ appMode }),

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
        appMode: state.appMode,
        currency: state.currency,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
