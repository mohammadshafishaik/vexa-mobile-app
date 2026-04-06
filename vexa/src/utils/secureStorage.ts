import * as Keychain from 'react-native-keychain';

const AUTH_SERVICE = 'com.vexa.auth';
const USER_SERVICE = 'com.vexa.user';

/**
 * Save auth tokens securely to Keychain
 */
export async function saveTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  try {
    await Keychain.setGenericPassword(
      'tokens',
      JSON.stringify(tokens),
      { service: AUTH_SERVICE }
    );
  } catch (error) {
    console.error('[SecureStorage] Failed to save tokens:', error);
  }
}

/**
 * Retrieve auth tokens from Keychain
 */
export async function getTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: AUTH_SERVICE,
    });
    if (credentials) {
      return JSON.parse(credentials.password);
    }
    return null;
  } catch (error) {
    console.error('[SecureStorage] Failed to get tokens:', error);
    return null;
  }
}

/**
 * Clear auth tokens from Keychain
 */
export async function clearTokens(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: AUTH_SERVICE });
  } catch (error) {
    console.error('[SecureStorage] Failed to clear tokens:', error);
  }
}

/**
 * Save user data to Keychain
 */
export async function saveUser(user: Record<string, any>): Promise<void> {
  try {
    await Keychain.setGenericPassword(
      'user',
      JSON.stringify(user),
      { service: USER_SERVICE }
    );
  } catch (error) {
    console.error('[SecureStorage] Failed to save user:', error);
  }
}

/**
 * Retrieve user data from Keychain
 */
export async function getUser(): Promise<Record<string, any> | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: USER_SERVICE,
    });
    if (credentials) {
      return JSON.parse(credentials.password);
    }
    return null;
  } catch (error) {
    console.error('[SecureStorage] Failed to get user:', error);
    return null;
  }
}

/**
 * Clear user data from Keychain
 */
export async function clearUser(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: USER_SERVICE });
  } catch (error) {
    console.error('[SecureStorage] Failed to clear user:', error);
  }
}

/**
 * Clear all stored auth data
 */
export async function clearAllAuth(): Promise<void> {
  await Promise.all([clearTokens(), clearUser()]);
}
