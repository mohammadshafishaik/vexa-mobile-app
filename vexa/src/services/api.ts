import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { NativeModules, Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

const PRODUCTION_BACKEND_URL = 'https://vexa-backend-hx9v.onrender.com';

type RuntimeEnv = {
  API_BASE_URL?: string;
  BACKEND_URL?: string;
};

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {});

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const resolveDevHost = (): string => {
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const host = scriptURL.replace(/^https?:\/\//, '').split(':')[0];
    if (host) {
      return host;
    }
  }

  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

const configuredApiBaseUrl = normalizeUrl(runtimeEnv.API_BASE_URL || '');
const configuredBackendUrl = normalizeUrl(runtimeEnv.BACKEND_URL || '');
const defaultBackendUrl = PRODUCTION_BACKEND_URL;

// Export BACKEND_URL for better-auth and Socket.io clients (without /api suffix).
export const BACKEND_URL = configuredBackendUrl
  || (configuredApiBaseUrl
    ? configuredApiBaseUrl.replace(/\/api\/?$/, '')
    : defaultBackendUrl);

const BASE_URL = configuredApiBaseUrl || `${BACKEND_URL}/api`;

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

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

    // If 401 and we haven't retried yet, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = useAuthStore.getState().tokens;
        if (!tokens?.refreshToken) {
          throw new Error('No refresh token available');
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
      } catch (refreshError) {
        // Refresh failed — force logout
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
