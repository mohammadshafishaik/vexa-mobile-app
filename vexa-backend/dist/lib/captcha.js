// ═══════════════════════════════════════════════════════════════════════════════
// VEXA 2.0 — Cloudflare Turnstile Captcha Verification
// Server-side verification with attempt tracking and rate limiting
// ═══════════════════════════════════════════════════════════════════════════════
import prisma from './prisma';
// ─── Configuration ──────────────────────────────────────────────────────────
const TURNSTILE_SECRET_KEY = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_FAILED_ATTEMPTS_PER_IP = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
// ─── Core Verification ──────────────────────────────────────────────────────
/**
 * Verify a Cloudflare Turnstile token server-side.
 */
async function verifyTurnstileToken(token, ipAddress) {
    if (!TURNSTILE_SECRET_KEY) {
        console.warn('[Captcha] CLOUDFLARE_TURNSTILE_SECRET_KEY not set — skipping verification');
        return { success: true, errorCodes: [] };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('secret', TURNSTILE_SECRET_KEY);
        formData.append('response', token);
        formData.append('remoteip', ipAddress);
        const response = await fetch(TURNSTILE_VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
        });
        if (!response.ok) {
            throw new Error(`Turnstile API returned ${response.status}`);
        }
        const data = await response.json();
        return {
            success: data.success,
            challengeTs: data['challenge_ts'],
            hostname: data.hostname,
            errorCodes: data['error-codes'] || [],
            action: data.action,
        };
    }
    catch (error) {
        console.error('[Captcha] Turnstile verification request failed:', error.message);
        return {
            success: false,
            errorCodes: ['internal-error'],
        };
    }
}
// ─── Rate Limiting ──────────────────────────────────────────────────────────
/**
 * Check if an IP has exceeded the failed captcha attempt limit.
 */
async function isRateLimited(ipAddress, action) {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);
    const failedAttempts = await prisma.captchaVerification.count({
        where: {
            ipAddress,
            action,
            success: false,
            createdAt: { gte: windowStart },
        },
    });
    return failedAttempts >= MAX_FAILED_ATTEMPTS_PER_IP;
}
// ─── Public API ─────────────────────────────────────────────────────────────
/**
 * Full captcha verification flow:
 * 1. Check rate limit
 * 2. Verify token with Cloudflare
 * 3. Log verification result
 */
export async function verifyCaptcha(input) {
    const { token, ipAddress, action, userId } = input;
    // 1. Check rate limit
    const rateLimited = await isRateLimited(ipAddress, action);
    if (rateLimited) {
        // Log the rate-limited attempt
        await prisma.captchaVerification.create({
            data: {
                userId,
                action,
                provider: 'CLOUDFLARE_TURNSTILE',
                challengeTs: new Date(),
                ipAddress,
                success: false,
                errorCodes: ['rate-limited'],
                attemptCount: MAX_FAILED_ATTEMPTS_PER_IP + 1,
            },
        });
        return {
            success: false,
            error: 'Too many failed captcha attempts. Please try again later.',
            rateLimited: true,
        };
    }
    // 2. Verify with Cloudflare
    const result = await verifyTurnstileToken(token, ipAddress);
    // 3. Get attempt count for this IP + action in the current window
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);
    const previousAttempts = await prisma.captchaVerification.count({
        where: {
            ipAddress,
            action,
            createdAt: { gte: windowStart },
        },
    });
    // 4. Log verification result
    await prisma.captchaVerification.create({
        data: {
            userId,
            action,
            provider: 'CLOUDFLARE_TURNSTILE',
            challengeTs: result.challengeTs ? new Date(result.challengeTs) : new Date(),
            hostname: result.hostname,
            ipAddress,
            success: result.success,
            errorCodes: result.errorCodes,
            attemptCount: previousAttempts + 1,
        },
    });
    if (!result.success) {
        const remainingAttempts = MAX_FAILED_ATTEMPTS_PER_IP - previousAttempts - 1;
        return {
            success: false,
            error: `Captcha verification failed. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'You will be temporarily blocked.'}`,
        };
    }
    return { success: true };
}
/**
 * Check if captcha is configured and available.
 */
export function isCaptchaConfigured() {
    return !!TURNSTILE_SECRET_KEY;
}
/**
 * Express middleware for captcha verification.
 * Expects `captchaToken` in request body.
 */
export function captchaMiddleware(action) {
    return async (req, res, next) => {
        // Skip in development if not configured
        if (!TURNSTILE_SECRET_KEY && process.env.NODE_ENV === 'development') {
            return next();
        }
        const token = req.body?.captchaToken;
        if (!token) {
            return res.status(400).json({ error: 'Captcha token required' });
        }
        const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
            || req.socket?.remoteAddress
            || '0.0.0.0';
        const result = await verifyCaptcha({
            token,
            ipAddress,
            action,
            userId: req.user?.id,
        });
        if (!result.success) {
            const statusCode = result.rateLimited ? 429 : 403;
            return res.status(statusCode).json({ error: result.error });
        }
        next();
    };
}
//# sourceMappingURL=captcha.js.map