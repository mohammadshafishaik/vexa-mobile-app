import { create } from 'zustand';
import { User, AuthTokens, UserRole } from '../types';
import {
  saveTokens,
  getTokens,
  clearTokens,
  saveUser,
  getUser,
  clearAllAuth,
} from '../utils/secureStorage';

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  hydrateAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,
  error: null,

  // Actions
  setUser: (user) => {
    set({ user });
    saveUser(user as any).catch(() => {});
  },

  setTokens: (tokens) => {
    set({ tokens });
    saveTokens(tokens).catch(() => {});
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  login: (user, tokens) => {
    set({
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    // Persist to secure storage
    Promise.all([
      saveTokens(tokens),
      saveUser(user as any),
    ]).catch((err) => console.warn('[AuthStore] Failed to persist auth:', err));
  },

  logout: () => {
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    // Clear secure storage
    clearAllAuth().catch((err) =>
      console.warn('[AuthStore] Failed to clear auth:', err)
    );
  },

  updateUser: (updates) => {
    set((state) => {
      const updatedUser = state.user ? { ...state.user, ...updates } : null;
      if (updatedUser) {
        saveUser(updatedUser as any).catch(() => {});
      }
      return { user: updatedUser };
    });
  },

  hydrateAuth: async () => {
    try {
      const [storedTokens, storedUser] = await Promise.all([
        getTokens(),
        getUser(),
      ]);

      if (storedTokens && storedUser) {
        set({
          tokens: storedTokens,
          user: storedUser as User,
          isAuthenticated: true,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch (error) {
      console.warn('[AuthStore] Hydration failed:', error);
      set({ isHydrated: true });
    }
  },
}));
