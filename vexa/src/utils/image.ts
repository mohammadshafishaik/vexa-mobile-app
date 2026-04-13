import { BACKEND_URL } from '../services/api';

const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?/i;
const HAS_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export const resolveImageUrl = (input?: string | null): string => {
  if (!input) return '';

  const value = input.trim();
  if (!value) return '';

  const base = BACKEND_URL.replace(/\/+$/, '');

  if (value.startsWith('/')) {
    return `${base}${value}`;
  }

  if (LOCAL_URL_PATTERN.test(value)) {
    return value.replace(LOCAL_URL_PATTERN, base);
  }

  // Convert bare relative paths like "uploads/file.jpg" into absolute backend URLs.
  if (!HAS_SCHEME_PATTERN.test(value)) {
    return `${base}/${value.replace(/^\/+/, '')}`;
  }

  // If uploads were stored with http scheme for the same backend host, upgrade to backend origin.
  try {
    const parsed = new URL(value);
    const backend = new URL(base);
    if (parsed.protocol === 'http:' && parsed.host === backend.host) {
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Ignore malformed URL and return raw value below.
  }

  return value;
};
