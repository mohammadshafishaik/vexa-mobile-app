import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'vexa-admin-access-fallback';
const ADMIN_JWT_REFRESH_SECRET = process.env.ADMIN_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET || 'vexa-admin-refresh-fallback';

export interface AdminTokenPayload {
  userId: string;
  email: string;
  role: 'ADMIN';
  adminRole: 'SUPER_ADMIN' | 'MODERATOR';
  sessionId: string;
}

export function generateAdminAccessToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: '12h' });
}

export function generateAdminRefreshToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, ADMIN_JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyAdminAccessToken(token: string): AdminTokenPayload {
  return jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;
}

export function verifyAdminRefreshToken(token: string): AdminTokenPayload {
  return jwt.verify(token, ADMIN_JWT_REFRESH_SECRET) as AdminTokenPayload;
}
