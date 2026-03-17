import { create } from 'zustand';
import { User, AuthTokens, UserRole } from '../types';

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  setUser: (user) => set({ user }),

  setTokens: (tokens) => set({ tokens }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  login: (user, tokens) =>
    set({
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    }),

  logout: () =>
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    }),

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
