import { Platform } from 'react-native';

// Use local backend in debug builds and production backend in release builds.
const DEV_MODE = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const PRODUCTION_BACKEND_URL = 'https://vexa-backend-hx9v.onrender.com';
// Android emulator uses 10.0.2.2 to reach host localhost
const LOCAL_BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const normalizeBackendUrl = (value: string): string =>
  value.replace(/\/+$/, '').replace(/\/api$/i, '');

const readStringFromRuntime = (key: string): string | null => {
  const fromGlobal = (globalThis as Record<string, unknown>)[key];
  if (typeof fromGlobal === 'string' && fromGlobal.trim()) {
    return fromGlobal.trim();
  }

  const maybeProcess = (globalThis as Record<string, unknown>).process as
    | { env?: Record<string, string | undefined> }
    | undefined;
  const fromEnv = maybeProcess?.env?.[key];
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim();
  }

  return null;
};

const getManualBackendOverride = (): string | null => {
  return readStringFromRuntime('__VEXA_BACKEND_URL__') || readStringFromRuntime('VEXA_BACKEND_URL');
};

const resolveBackendUrl = (): string => {
  const manualOverride = getManualBackendOverride();
  if (manualOverride) {
    return normalizeBackendUrl(manualOverride);
  }

  return normalizeBackendUrl(DEV_MODE ? LOCAL_BACKEND_URL : PRODUCTION_BACKEND_URL);
};

export const BACKEND_URL = resolveBackendUrl();
export const API_BASE_URL = `${BACKEND_URL}/api`;

