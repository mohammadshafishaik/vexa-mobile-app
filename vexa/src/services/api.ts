import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL, BACKEND_URL } from '../config/backend';

// Export BACKEND_URL for better-auth and Socket.io clients (without /api suffix).
export { BACKEND_URL };
const BASE_URL = API_BASE_URL;

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 35000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let lastWarmupAt = 0;

export const warmupBackend = async (): Promise<void> => {
  const now = Date.now();
  if (now - lastWarmupAt < 30_000) {
    return;
  }

  try {
    await axios.get(`${BASE_URL}/health`, {
      timeout: 20_000,
      headers: { Accept: 'application/json' },
    });
    lastWarmupAt = Date.now();
  } catch {
    // Ignore warmup errors and let caller attempt the real request.
  }
};

const NON_REFRESHABLE_AUTH_PATHS = [
  '/custom-auth/login',
  '/custom-auth/register',
  '/custom-auth/google',
  '/custom-auth/forgot-password',
  '/custom-auth/reset-password',
  '/custom-auth/refresh',
];

const isNonRefreshableAuthRequest = (url?: string): boolean => {
  if (!url) return false;
  return NON_REFRESHABLE_AUTH_PATHS.some((path) => url.includes(path));
};

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const shouldSkipRefresh = isNonRefreshableAuthRequest(originalRequest?.url);

    // If 401 and we haven't retried yet, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;

      try {
        const tokens = useAuthStore.getState().tokens;
        if (!tokens?.refreshToken) {
          // No refresh token means the session is already invalid.
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        // Call refresh endpoint (will be implemented in Phase 3)
        const response = await axios.post(`${BASE_URL}/custom-auth/refresh`, {
          refreshToken: tokens.refreshToken,
        });

        const newTokens = response.data.data;
        useAuthStore.getState().setTokens(newTokens);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — force logout
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
