import { createAuthClient } from 'better-auth/client';
import { BACKEND_URL } from '../services/api';

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
});

export const {
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
} = authClient;
