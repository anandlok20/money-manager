'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  lockEnabled: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  lastActivity: number;
  setUser: (user: User | null) => void;
  setIsLocked: (locked: boolean) => void;
  updateLastActivity: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLocked: false,
      lastActivity: Date.now(),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLocked: false,
          lastActivity: Date.now(),
        }),

      setIsLocked: (locked) =>
        set({ isLocked: locked }),

      updateLastActivity: () =>
        set({ lastActivity: Date.now() }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLocked: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isLocked: state.isLocked,
        lastActivity: state.lastActivity,
      }),
    }
  )
);
