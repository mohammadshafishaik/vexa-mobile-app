import jwt from 'jsonwebtoken';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'vexa-admin-access-fallback';
const ADMIN_JWT_REFRESH_SECRET = process.env.ADMIN_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET || 'vexa-admin-refresh-fallback';
export function generateAdminAccessToken(payload) {
    return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: '12h' });
}
export function generateAdminRefreshToken(payload) {
    return jwt.sign(payload, ADMIN_JWT_REFRESH_SECRET, { expiresIn: '30d' });
}
export function verifyAdminAccessToken(token) {
    return jwt.verify(token, ADMIN_JWT_SECRET);
}
export function verifyAdminRefreshToken(token) {
    return jwt.verify(token, ADMIN_JWT_REFRESH_SECRET);
}
//# sourceMappingURL=jwt.js.map