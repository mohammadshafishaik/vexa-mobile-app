export interface AdminTokenPayload {
    userId: string;
    email: string;
    role: 'ADMIN';
    adminRole: 'SUPER_ADMIN' | 'MODERATOR';
    sessionId: string;
}
export declare function generateAdminAccessToken(payload: AdminTokenPayload): string;
export declare function generateAdminRefreshToken(payload: AdminTokenPayload): string;
export declare function verifyAdminAccessToken(token: string): AdminTokenPayload;
export declare function verifyAdminRefreshToken(token: string): AdminTokenPayload;
//# sourceMappingURL=jwt.d.ts.map