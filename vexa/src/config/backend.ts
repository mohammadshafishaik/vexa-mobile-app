import { NativeModules, Platform } from 'react-native';

const PRODUCTION_BACKEND_URL = 'https://vexa-backend-hx9v.onrender.com';
const ANDROID_EMULATOR_BACKEND_URL = 'http://10.0.2.2:3000';
const IOS_SIMULATOR_BACKEND_URL = 'http://localhost:3000';

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

const readBooleanFromRuntime = (key: string): boolean => {
  const value = readStringFromRuntime(key);
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const getManualBackendOverride = (): string | null => {
  return readStringFromRuntime('__VEXA_BACKEND_URL__') || readStringFromRuntime('VEXA_BACKEND_URL');
};

const inferBackendFromMetroHost = (): string | null => {
  const scriptURL = (NativeModules as Record<string, any>)?.SourceCode?.scriptURL;
  if (typeof scriptURL !== 'string' || !scriptURL.trim()) {
    return null;
  }

  const match = scriptURL.match(/^[a-zA-Z]+:\/\/([^/:]+)/);
  const host = match?.[1];
  if (!host) {
    return null;
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    return Platform.OS === 'android'
      ? ANDROID_EMULATOR_BACKEND_URL
      : IOS_SIMULATOR_BACKEND_URL;
  }

  return `http://${host}:3000`;
};

const resolveDevBackendUrl = (): string =>
  inferBackendFromMetroHost()
  || (Platform.OS === 'android' ? ANDROID_EMULATOR_BACKEND_URL : IOS_SIMULATOR_BACKEND_URL);

const resolveBackendUrl = (): string => {
  const manualOverride = getManualBackendOverride();
  if (manualOverride) {
    return normalizeBackendUrl(manualOverride);
  }

  // Production backend remains the default in development unless explicitly opted in.
  // Enable local backend mode by setting __VEXA_USE_LOCAL_BACKEND__=true at runtime
  // or VEXA_USE_LOCAL_BACKEND=true in environment wiring.
  const useLocalBackendInDev = readBooleanFromRuntime('__VEXA_USE_LOCAL_BACKEND__')
    || readBooleanFromRuntime('VEXA_USE_LOCAL_BACKEND');

  if (__DEV__ && useLocalBackendInDev) {
    return normalizeBackendUrl(resolveDevBackendUrl());
  }

  return normalizeBackendUrl(PRODUCTION_BACKEND_URL);
};

export const BACKEND_URL = resolveBackendUrl();
export const API_BASE_URL = `${BACKEND_URL}/api`;
