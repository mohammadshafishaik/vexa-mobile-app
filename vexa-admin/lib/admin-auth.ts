const ACCESS_TOKEN_KEY = 'vexa_admin_access_token';
const REFRESH_TOKEN_KEY = 'vexa_admin_refresh_token';

const isBrowser = (): boolean => typeof window !== 'undefined';

export const tokenStore = {
  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    const match = document.cookie.match(new RegExp('(^| )' + ACCESS_TOKEN_KEY + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  },

  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    const match = document.cookie.match(new RegExp('(^| )' + REFRESH_TOKEN_KEY + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  },

  setTokens(accessToken: string, refreshToken: string): void {
    if (!isBrowser()) return;
    const days = 7;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    
    document.cookie = `${ACCESS_TOKEN_KEY}=${encodeURIComponent(accessToken)}${expires}; path=/; SameSite=Lax`;
    document.cookie = `${REFRESH_TOKEN_KEY}=${encodeURIComponent(refreshToken)}${expires}; path=/; SameSite=Lax`;
  },

  clearTokens(): void {
    if (!isBrowser()) return;
    document.cookie = `${ACCESS_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${REFRESH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  },
};
