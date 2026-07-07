export interface TurnstileVerifyResult {
    success: boolean;
    challengeTs?: string;
    hostname?: string;
    errorCodes: string[];
    action?: string;
}
export interface CaptchaVerifyInput {
    token: string;
    ipAddress: string;
    action: string;
    userId?: string;
}
export interface CaptchaVerifyResult {
    success: boolean;
    error?: string;
    rateLimited?: boolean;
}
/**
 * Full captcha verification flow:
 * 1. Check rate limit
 * 2. Verify token with Cloudflare
 * 3. Log verification result
 */
export declare function verifyCaptcha(input: CaptchaVerifyInput): Promise<CaptchaVerifyResult>;
/**
 * Check if captcha is configured and available.
 */
export declare function isCaptchaConfigured(): boolean;
/**
 * Express middleware for captcha verification.
 * Expects `captchaToken` in request body.
 */
export declare function captchaMiddleware(action: string): (req: any, res: any, next: any) => Promise<any>;
//# sourceMappingURL=captcha.d.ts.map