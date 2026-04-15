'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';

interface UseAdminResourceOptions<T> {
  path: string;
  immediate?: boolean;
  transform?: (payload: unknown) => T;
}

interface UseAdminResourceResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminResource<T>(options: UseAdminResourceOptions<T>): UseAdminResourceResult<T> {
  const { path, immediate = true, transform } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest transform without letting unstable inline callbacks retrigger refresh loops.
  const transformRef = useRef<typeof transform>(transform);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.get<unknown>(path);
      const map = transformRef.current;
      const nextData = map ? map(response.data) : (response.data as T);
      setData(nextData);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to load resource'));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (immediate) {
      refresh();
    }
  }, [immediate, refresh]);

  return { data, loading, error, refresh };
}
