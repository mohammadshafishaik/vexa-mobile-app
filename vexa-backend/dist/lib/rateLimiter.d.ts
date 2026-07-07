import type { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
    skipFailedRequests?: boolean;
    skipSuccessfulRequests?: boolean;
}
interface WindowEntry {
    timestamps: number[];
    blocked: boolean;
    blockedUntil: number;
}
interface RateLimitStore {
    get(key: string): Promise<WindowEntry | undefined>;
    set(key: string, entry: WindowEntry, ttlMs: number): Promise<void>;
    increment(key: string, windowMs: number, maxRequests: number): Promise<{
        count: number;
        blocked: boolean;
        resetAt: number;
    }>;
    reset(key: string): Promise<void>;
}
declare class MemoryStore implements RateLimitStore {
    private store;
    private cleanupInterval;
    constructor(cleanupIntervalMs?: number);
    get(key: string): Promise<WindowEntry | undefined>;
    set(key: string, entry: WindowEntry, _ttlMs: number): Promise<void>;
    increment(key: string, windowMs: number, maxRequests: number): Promise<{
        count: number;
        blocked: boolean;
        resetAt: number;
    }>;
    reset(key: string): Promise<void>;
    private cleanup;
    destroy(): void;
}
declare const store: MemoryStore;
/**
 * Create a rate limiting middleware.
 */
export declare function rateLimit(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Auth endpoints: 5 requests per minute per IP.
 * Protects login, signup, forgot-password.
 */
export declare const authLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Bid submission: 30 requests per minute per user.
 */
export declare const bidLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * General API: 100 requests per minute per IP.
 */
export declare const generalLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Strict limiter for sensitive operations: 3 requests per 5 minutes.
 * Protects password reset, email change, phone verification.
 */
export declare const strictLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload limiter: 20 uploads per minute per user.
 */
export declare const uploadLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Search/listing: 60 requests per minute per IP.
 */
export declare const searchLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Payment operations: 10 requests per minute per user.
 */
export declare const paymentLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reset rate limit for a specific key (e.g., after successful auth).
 */
export declare function resetRateLimit(key: string): Promise<void>;
export { store as rateLimitStore };
//# sourceMappingURL=rateLimiter.d.ts.map