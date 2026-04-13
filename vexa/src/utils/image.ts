import { BACKEND_URL } from '../services/api';

const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i;

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

  return value;
};
