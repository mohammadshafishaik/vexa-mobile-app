import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const PRODUCTION_BACKEND_URL = 'https://vexa-backend-hx9v.onrender.com';

type RuntimeEnv = {
  API_BASE_URL?: string;
  BACKEND_URL?: string;
};

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {});

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '');

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

const isNetworkFailure = (error: AxiosError): boolean => {
  const msg = String(error.message || '').toLowerCase();
  return error.code === 'ERR_NETWORK' || msg.includes('network error') || !error.response;
};

const buildRequestUrl = (config: InternalAxiosRequestConfig): string => {
  const requestUrl = config.url || '';
  if (/^https?:\/\//i.test(requestUrl)) {
    return requestUrl;
  }

  const base = String(config.baseURL || BASE_URL).replace(/\/+$/, '');
  const path = requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`;
  return `${base}${path}`;
};

const toHeaderObject = (headers: unknown): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!headers || typeof headers !== 'object') {
    return result;
  }

  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      continue;
    }
    result[key] = String(value);
  }
  return result;
};

const fetchWithFallback = async (
  config: InternalAxiosRequestConfig & { _fetchFallbackAttempted?: boolean },
) => {
  const url = buildRequestUrl(config);
  const method = String(config.method || 'get').toUpperCase();
  const headers = toHeaderObject(config.headers);

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD' && config.data !== undefined) {
    if (typeof config.data === 'string') {
      body = config.data;
    } else {
      body = JSON.stringify(config.data);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
  };
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
      _fetchFallbackAttempted?: boolean;
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

    // Some Android builds intermittently throw ERR_NETWORK from Axios transport.
    // Retry once with native fetch before surfacing a network error.
    if (originalRequest && isNetworkFailure(error) && !originalRequest._fetchFallbackAttempted) {
      originalRequest._fetchFallbackAttempted = true;

      try {
        const fallback = await fetchWithFallback(originalRequest);
        if (fallback.ok) {
          return {
            data: fallback.data,
            status: fallback.status,
            statusText: fallback.statusText,
            headers: {},
            config: originalRequest,
            request: undefined,
          };
        }

        return Promise.reject({
          ...error,
          code: undefined,
          response: {
            status: fallback.status,
            data: fallback.data,
            headers: {},
            config: originalRequest,
          },
          config: originalRequest,
        });
      } catch (fetchError) {
        // Keep original Axios error if fallback also fails.
      }
    }

    return Promise.reject(error);
  },
);

export default api;
