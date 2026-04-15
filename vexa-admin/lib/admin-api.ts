import { tokenStore } from './admin-auth';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${baseUrl}/admin/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    tokenStore.clearTokens();
    return null;
  }

  const payload = await response.json() as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
  if (!payload.success || !payload.data?.accessToken || !payload.data?.refreshToken) {
    tokenStore.clearTokens();
    return null;
  }

  tokenStore.setTokens(payload.data.accessToken, payload.data.refreshToken);
  return payload.data.accessToken;
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<ApiEnvelope<T>> {
  const accessToken = tokenStore.getAccessToken();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401 && !retried) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return request<T>(path, init, true);
    }
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      json?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return json as ApiEnvelope<T>;
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  }),

  patch: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
