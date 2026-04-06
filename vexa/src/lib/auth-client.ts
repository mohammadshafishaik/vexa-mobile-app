import { createAuthClient } from 'better-auth/client';
import { Platform } from 'react-native';

// Use 10.0.2.2 for Android emulator, localhost for iOS simulator
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const authClient = createAuthClient({
  baseURL: `http://${HOST}:3000`,
});

// Export convenience methods
export const {
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
} = authClient;
