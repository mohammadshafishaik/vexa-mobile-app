import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Base URL will be configured via environment variable in Phase 3
const BASE_URL = 'http://localhost:3000/api';

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
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
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
