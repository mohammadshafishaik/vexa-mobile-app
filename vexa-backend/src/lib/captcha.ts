import prisma from './prisma';
import svgCaptcha from 'svg-captcha';
import { v4 as uuidv4 } from 'uuid';

const MAX_FAILED_ATTEMPTS_PER_IP = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

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

// Memory store for captchas (in production, use Redis)
const captchaStore = new Map<string, { text: string; expires: number }>();

export function generateSvgCaptcha() {
  const captcha = svgCaptcha.create({
    size: 6,
    ignoreChars: '0o1i',
    noise: 3,
    color: true,
    background: '#1a1a1a',
  });
  const id = uuidv4();
  captchaStore.set(id, {
    text: captcha.text.toLowerCase(),
    expires: Date.now() + 5 * 60 * 1000, // 5 mins
  });
  return { id, svg: captcha.data };
}

async function verifySvgCaptcha(id: string, text: string): Promise<boolean> {
  const stored = captchaStore.get(id);
  if (!stored) return false;
  if (Date.now() > stored.expires) {
    captchaStore.delete(id);
    return false;
  }
  const isValid = stored.text === text.toLowerCase();
  captchaStore.delete(id); // consume
  return isValid;
}

export async function verifyCaptcha(input: CaptchaVerifyInput): Promise<CaptchaVerifyResult> {
  const { token, ipAddress, action, userId } = input;

  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);
  const failedAttempts = await prisma.captchaVerification.count({
    where: { ipAddress, action, success: false, createdAt: { gte: windowStart } },
  });

  if (failedAttempts >= MAX_FAILED_ATTEMPTS_PER_IP) {
    return { success: false, error: 'Too many failed attempts.', rateLimited: true };
  }

  // token format for SVG captcha: "id:text"
  const [id, ...textParts] = token.split(':');
  const text = textParts.join(':');

  const isValid = await verifySvgCaptcha(id, text);

  await prisma.captchaVerification.create({
    data: {
      userId,
      action,
      provider: 'SVG_CAPTCHA',
      challengeTs: new Date(),
      ipAddress,
      success: isValid,
      errorCodes: isValid ? [] : ['invalid-captcha'],
      attemptCount: failedAttempts + 1,
    },
  });

  if (!isValid) {
    return { success: false, error: 'Invalid captcha code. Please try again.' };
  }

  return { success: true };
}

export function isCaptchaConfigured(): boolean {
  return true; // Always enabled for SVG
}

export function captchaMiddleware(action: string) {
  return async (req: any, res: any, next: any) => {
    // We force captcha even in dev now so the user can test it
    const token = req.body?.captchaToken;
    if (!token) {
      return res.status(400).json({ error: 'Captcha token required (format: id:text)' });
    }

    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';

    const result = await verifyCaptcha({ token, ipAddress, action, userId: req.user?.id });

    if (!result.success) {
      return res.status(result.rateLimited ? 429 : 403).json({ error: result.error, success: false, message: result.error });
    }

    next();
  };
}
