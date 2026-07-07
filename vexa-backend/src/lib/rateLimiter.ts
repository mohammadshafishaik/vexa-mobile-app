// ═══════════════════════════════════════════════════════════════════════════════
// VEXA 2.0 — Rate Limiter
// In-memory sliding window rate limiter with Redis-ready interface
// ═══════════════════════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RateLimitConfig {
  windowMs: number;      // Window size in milliseconds
  maxRequests: number;    // Max requests per window
  message?: string;       // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key extraction
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

interface WindowEntry {
  timestamps: number[];
  blocked: boolean;
  blockedUntil: number;
}

// ─── Store Interface (Redis-ready) ──────────────────────────────────────────

interface RateLimitStore {
  get(key: string): Promise<WindowEntry | undefined>;
  set(key: string, entry: WindowEntry, ttlMs: number): Promise<void>;
  increment(key: string, windowMs: number, maxRequests: number): Promise<{ count: number; blocked: boolean; resetAt: number }>;
  reset(key: string): Promise<void>;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────

class MemoryStore implements RateLimitStore {
  private store = new Map<string, WindowEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs: number = 60_000) {
    // Periodically clean expired entries to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);

    // Prevent timer from keeping process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  async get(key: string): Promise<WindowEntry | undefined> {
    return this.store.get(key);
  }

  async set(key: string, entry: WindowEntry, _ttlMs: number): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, windowMs: number, maxRequests: number): Promise<{ count: number; blocked: boolean; resetAt: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    let entry = this.store.get(key);

    if (!entry) {
      entry = { timestamps: [], blocked: false, blockedUntil: 0 };
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockedUntil > now) {
      return {
        count: maxRequests + 1,
        blocked: true,
        resetAt: entry.blockedUntil,
      };
    }

    // Remove expired timestamps (sliding window)
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    // Add current request
    entry.timestamps.push(now);

    const count = entry.timestamps.length;
    const blocked = count > maxRequests;

    if (blocked && !entry.blocked) {
      entry.blocked = true;
      entry.blockedUntil = now + windowMs;
    } else if (!blocked) {
      entry.blocked = false;
      entry.blockedUntil = 0;
    }

    this.store.set(key, entry);

    const resetAt = entry.timestamps.length > 0
      ? entry.timestamps[0] + windowMs
      : now + windowMs;

    return { count, blocked, resetAt };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;
    for (const [key, entry] of this.store.entries()) {
      // Remove entries with no recent timestamps and not blocked
      if (entry.timestamps.length === 0 && (!entry.blocked || entry.blockedUntil < now)) {
        this.store.delete(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      console.log(`[RateLimiter] Cleaned ${deleted} expired entries (${this.store.size} remaining)`);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// ─── Singleton Store ────────────────────────────────────────────────────────

const store = new MemoryStore();

// ─── Key Generators ─────────────────────────────────────────────────────────

function getIpAddress(req: Request): string {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || '0.0.0.0';
}

function defaultKeyGenerator(req: Request): string {
  return `ip:${getIpAddress(req)}`;
}

function userKeyGenerator(req: Request): string {
  const userId = (req as any).user?.id;
  return userId ? `user:${userId}` : `ip:${getIpAddress(req)}`;
}

function endpointKeyGenerator(req: Request): string {
  const ip = getIpAddress(req);
  const route = req.baseUrl + req.path;
  return `ep:${ip}:${route}`;
}

// ─── Middleware Factory ─────────────────────────────────────────────────────

/**
 * Create a rate limiting middleware.
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please try again later.',
    keyGenerator = defaultKeyGenerator,
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = keyGenerator(req);
    const result = await store.increment(key, windowMs, maxRequests);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - result.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (result.blocked) {
      const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);

      res.status(429).json({
        error: message,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

// ─── Pre-configured Limiters ────────────────────────────────────────────────

/**
 * Auth endpoints: 5 requests per minute per IP.
 * Protects login, signup, forgot-password.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again in 1 minute.',
  keyGenerator: defaultKeyGenerator,
});

/**
 * Bid submission: 30 requests per minute per user.
 */
export const bidLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many bid submissions. Please slow down.',
  keyGenerator: userKeyGenerator,
});

/**
 * General API: 100 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Rate limit exceeded. Please try again later.',
  keyGenerator: defaultKeyGenerator,
});

/**
 * Strict limiter for sensitive operations: 3 requests per 5 minutes.
 * Protects password reset, email change, phone verification.
 */
export const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3,
  message: 'Too many attempts. Please try again in 5 minutes.',
  keyGenerator: defaultKeyGenerator,
});

/**
 * Upload limiter: 20 uploads per minute per user.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many uploads. Please try again later.',
  keyGenerator: userKeyGenerator,
});

/**
 * Search/listing: 60 requests per minute per IP.
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Too many search requests. Please slow down.',
  keyGenerator: endpointKeyGenerator,
});

/**
 * Payment operations: 10 requests per minute per user.
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many payment requests. Please try again later.',
  keyGenerator: userKeyGenerator,
});

// ─── Reset Helper ───────────────────────────────────────────────────────────

/**
 * Reset rate limit for a specific key (e.g., after successful auth).
 */
export async function resetRateLimit(key: string): Promise<void> {
  await store.reset(key);
}

export { store as rateLimitStore };
