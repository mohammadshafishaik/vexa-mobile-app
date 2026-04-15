'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminApi, ApiError } from '@/lib/admin-api';
import { tokenStore } from '@/lib/admin-auth';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
  adminRole: 'SUPER_ADMIN' | 'MODERATOR';
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  admin: AdminProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const accessToken = tokenStore.getAccessToken();
    if (!accessToken) {
      setAdmin(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await adminApi.get<AdminProfile>('/admin/me');
      if (!response.success) {
        throw new Error('Failed to load admin profile');
      }
      setAdmin(response.data);
    } catch {
      tokenStore.clearTokens();
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async ({ email, password }: LoginInput) => {
    const response = await adminApi.post<{
      admin: AdminProfile;
      tokens: { accessToken: string; refreshToken: string };
    }>('/admin/login', { email, password });

    if (!response.success) {
      throw new Error('Login failed');
    }

    tokenStore.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    setAdmin(response.data.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.post('/admin/logout');
    } catch {
      // Ignore logout errors and clear local session anyway.
    }

    tokenStore.clearTokens();
    setAdmin(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    admin,
    isLoading,
    isAuthenticated: !!admin,
    login,
    logout,
    refreshProfile,
  }), [admin, isLoading, login, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new ApiError('useAdminAuth must be used within AdminAuthProvider', 500);
  }
  return context;
}
