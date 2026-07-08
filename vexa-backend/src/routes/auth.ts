import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import { sendPasswordResetEmail, isEmailConfigured, sendWelcomeEmail, sendLoginOtpEmail } from '../lib/email';
import { captchaMiddleware, isCaptchaConfigured, generateSvgCaptcha } from '../lib/captcha';
import { getAccountAccessBlock, shouldAutoReactivateSuspendedAccount } from '../utils/accountStatus';
import { AVAILABLE_SERVICE_CATEGORIES, normalizeServiceCategory } from '../utils/serviceCategories';
import {
  validateRegistration,
  validateLogin,
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
} from '../utils/validation';

const router = Router();

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  password: true,
  googleId: true,
  avatarUrl: true,
  phone: true,
  role: true,
  accountStatus: true,
  suspendedUntil: true,
  banReason: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  providerProfile: {
    select: {
      bio: true,
      availabilityStatus: true,
    }
  },
  kycVerifications: {
    select: {
      status: true,
      fileUrl: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  }
} as const;

const toPublicUser = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  phone: user.phone,
  bio: user.providerProfile?.bio || null,
  availabilityStatus: user.providerProfile?.availabilityStatus || 'OFFLINE',
  role: user.role,
  isVerified: user.isVerified,
  kycStatus: user.kycVerifications?.[0]?.status || 'PENDING',
  kycDocuments: user.kycVerifications?.map((doc: any) => doc.fileUrl) || [],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const ensureAccountAccess = async (
  user: {
    id: string;
    accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DEACTIVATED' | 'DELETED';
    suspendedUntil?: Date | null;
    banReason?: string | null;
  },
  res: Response,
): Promise<boolean> => {
  let accountStatus = user.accountStatus;
  let suspendedUntil = user.suspendedUntil ?? null;
  let banReason = user.banReason ?? null;

  if (shouldAutoReactivateSuspendedAccount(user)) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountStatus: 'ACTIVE',
        suspendedUntil: null,
        banReason: null,
      },
    });

    accountStatus = 'ACTIVE';
    suspendedUntil = null;
    banReason = null;
  }

  const accountBlock = getAccountAccessBlock({
    accountStatus,
    suspendedUntil,
    banReason,
  });

  if (accountBlock) {
    res.status(accountBlock.statusCode).json({
      success: false,
      code: accountBlock.code,
      message: accountBlock.message,
    });
    return false;
  }

  return true;
};

const isSchemaMismatchError = (error: any): boolean => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'P2021'
    || error?.code === 'P2022'
    || message.includes('column') && message.includes('does not exist')
    || message.includes('table') && message.includes('does not exist');
};

const createUserCompat = async (data: {
  email: string;
  name: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  password?: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
}) => {
  try {
    const { role, ...userData } = data;
    const createData: any = {
      ...userData,
      role,
    };

    if (role === 'CUSTOMER') {
      createData.customerProfile = {
        create: {}
      };
    } else if (role === 'PROVIDER') {
      createData.providerProfile = {
        create: {
          availabilityStatus: 'OFFLINE'
        }
      };
    } else if (role === 'ADMIN') {
      createData.adminProfile = {
        create: {
          adminRole: 'MODERATOR'
        }
      };
    }

    return await prisma.user.create({
      data: createData,
      select: authUserSelect,
    });
  } catch (error: any) {
    if (!isSchemaMismatchError(error)) {
      throw error;
    }

    const fallbackId = uuidv4();
    const now = new Date();

    const availableColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
    `;

    const existingColumns = new Map(
      availableColumns.map((col) => [col.column_name.toLowerCase(), col.column_name]),
    );

    const candidates: Array<[string, unknown]> = [
      ['id', fallbackId],
      ['email', data.email],
      ['name', data.name],
      ['phone', data.phone ?? null],
      ['role', data.role],
      ['password', data.password ?? null],
      ['googleId', data.googleId ?? null],
      ['avatarUrl', data.avatarUrl ?? null],
      ['isVerified', data.isVerified ?? false],
      ['createdAt', now],
      ['updatedAt', now],
    ];

    const insertColumns: string[] = [];
    const insertValues: unknown[] = [];

    for (const [candidateName, candidateValue] of candidates) {
      const actualColumnName = existingColumns.get(candidateName.toLowerCase());
      if (actualColumnName) {
        insertColumns.push(actualColumnName);
        insertValues.push(candidateValue);
      }
    }

    if (insertColumns.length === 0) {
      throw error;
    }

    const columnSql = insertColumns.map((col) => `"${col}"`).join(', ');
    const valuesSql = insertValues.map((_, index) => `$${index + 1}`).join(', ');

    await prisma.$executeRawUnsafe(
      `INSERT INTO "users" (${columnSql}) VALUES (${valuesSql})`,
      ...insertValues,
    );

    const createdUser = await prisma.user.findUnique({
      where: { id: fallbackId },
      select: authUserSelect,
    });

    if (!createdUser) {
      throw error;
    }

    return createdUser;
  }
};

// ─── POST /api/auth/register ───────────────────────────
router.get('/captcha-image', (req: Request, res: Response) => {
  const captcha = generateSvgCaptcha();
  res.json({
    success: true,
    data: {
      id: captcha.id,
      svg: captcha.svg,
    },
  });
});

// ─── POST /api/auth/register ───────────────────────────
router.post('/register', captchaMiddleware('register'), async (req: Request, res: Response) => {
  try {
    const { email, name, phone, role, password, initialSkills } = req.body;

    // Validate all fields
    const validation = validateRegistration({ email, name, password, phone, role });
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
      return;
    }

    const normalizedProviderSkills = Array.isArray(initialSkills)
      ? Array.from(
          new Set(
            initialSkills
              .map((skill: unknown) => normalizeServiceCategory(String(skill || '')))
              .filter((skill: string) => AVAILABLE_SERVICE_CATEGORIES.includes(skill as any)),
          ),
        )
      : [];

    if (role === 'PROVIDER' && normalizedProviderSkills.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Please select at least one service category (for example: plumbing, electrical) to continue as a provider.',
      });
      return;
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await createUserCompat({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      phone: phone ? phone.replace(/\D/g, '').slice(-10) : null,
      role,
      password: hashedPassword,
      isVerified: false,
    });

    if (role === 'PROVIDER' && normalizedProviderSkills.length > 0) {
      await prisma.providerSkill.createMany({
        data: normalizedProviderSkills.map((category: string) => ({
          providerId: user.id,
          categoryName: category,
          experienceYears: 0,
        })),
        skipDuplicates: true,
      });
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const userWithoutPassword = toPublicUser(user);

    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    const errorCode = error?.code ? ` (${error.code})` : '';
    res.status(500).json({ success: false, message: `Registration failed. Please try again${errorCode}.` });
  }
});

// ─── POST /api/auth/login ──────────────────────────────
router.post('/login', captchaMiddleware('login'), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate
    const validation = validateLogin({ email, password });
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: authUserSelect,
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (!await ensureAccountAccess(user, res)) {
      return;
    }

    if (!user.password) {
      res.status(401).json({
        success: false,
        message: 'This account uses Google Sign-In. Please login with Google.',
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const userWithoutPassword = toPublicUser(user);

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    const errorCode = error?.code ? ` (${error.code})` : '';
    res.status(500).json({ success: false, message: `Login failed. Please try again${errorCode}.` });
  }
});
// ─── POST /api/auth/otp/send ───────────────────────────
router.post('/otp/send', captchaMiddleware('otp_send'), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      res.status(400).json({ success: false, message: 'Invalid email format' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, name: true, role: true, accountStatus: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'This email is not registered. Please register first.',
      });
      return;
    }

    if (!await ensureAccountAccess(user, res)) {
      return;
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = `otp:email:${email.trim().toLowerCase()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    await prisma.verification.upsert({
      where: { id: identifier },
      create: {
        id: identifier,
        identifier,
        value: otpCode,
        expiresAt,
      },
      update: {
        value: otpCode,
        expiresAt,
      },
    });

    // Send email
    const emailResult = await sendLoginOtpEmail(user.email, user.name, otpCode);
    if (!emailResult.success) {
      console.error('[Email] Failed to send login OTP:', emailResult.error);
      res.status(500).json({
        success: false,
        message: `Failed to send email verification: ${emailResult.error || 'Unknown SMTP error'}`,
      });
      return;
    }

    res.json({
      success: true,
      message: 'One-Time Password (OTP) has been sent to your email address.',
    });
  } catch (error: any) {
    console.error('OTP Send error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// ─── POST /api/auth/otp/verify ─────────────────────────
router.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP code are required' });
      return;
    }

    const identifier = `otp:email:${email.trim().toLowerCase()}`;
    const verification = await prisma.verification.findUnique({
      where: { id: identifier },
    });

    if (!verification || verification.value !== otp) {
      res.status(400).json({ success: false, message: 'Invalid OTP code' });
      return;
    }

    if (new Date() > verification.expiresAt) {
      res.status(400).json({ success: false, message: 'OTP code has expired' });
      return;
    }

    // OTP is valid; delete verification token to prevent replay attacks
    await prisma.verification.delete({
      where: { id: identifier },
    }).catch(() => {});

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: authUserSelect,
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!await ensureAccountAccess(user, res)) {
      return;
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const userWithoutPassword = toPublicUser(user);

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error: any) {
    console.error('OTP Verify error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// ─── POST /api/auth/google ─────────────────────────────
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken, email, name, photoUrl, googleId } = req.body;

    if (!email || !googleId) {
      res.status(400).json({
        success: false,
        message: 'Google authentication data is incomplete',
      });
      return;
    }

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: email.trim().toLowerCase() },
        ],
      },
      select: authUserSelect,
    });

    if (user) {
      // Update googleId if not set (email match)
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatarUrl: user.avatarUrl || photoUrl || null },
          select: authUserSelect,
        });
      }
    } else {
      // Create new user — will need role selection
      user = await createUserCompat({
        email: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        googleId,
        avatarUrl: photoUrl || null,
        isVerified: false,
        role: 'CUSTOMER', // Default, can be changed later
      });
    }

    if (!await ensureAccountAccess(user, res)) {
      return;
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const userWithoutPassword = toPublicUser(user);

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
        isNewUser: !user.password && !user.phone, // Hint: might need role selection
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    const errorCode = error?.code ? ` (${error.code})` : '';
    res.status(500).json({ success: false, message: `Google authentication failed${errorCode}.` });
  }
});

// ─── POST /api/auth/forgot-password ────────────────────
router.post('/forgot-password', captchaMiddleware('forgot_password'), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const emailValidation = validateEmail(email || '');
    if (!emailValidation.valid) {
      res.status(400).json({
        success: false,
        message: emailValidation.errors[0],
      });
      return;
    }

    if (!isEmailConfigured()) {
      res.status(503).json({
        success: false,
        message: 'Password reset email service is not configured. Please contact support at app.vexa.in@gmail.com',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        password: true,
        googleId: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Check if user has a password (Google-only users can't reset)
    if (!user.password && user.googleId) {
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Invalidate any existing tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate reset token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send the actual email
    const emailSent = await sendPasswordResetEmail(email.trim().toLowerCase(), token);
    if (!emailSent) {
      res.status(503).json({
        success: false,
        message: 'Unable to send password reset email right now. Please try again shortly.',
      });
      return;
    }

    // Also log in dev mode for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n📧 Password Reset Token for ${email}:`);
      console.log(`   Token: ${token}`);
      console.log(`   Expires: ${expiresAt.toISOString()}\n`);
    }

    const responsePayload: any = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.resetToken = token;
    }

    res.json(responsePayload);
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
});

// ─── POST /api/auth/reset-password ─────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: 'Reset token is required' });
      return;
    }

    const passwordValidation = validatePassword(password || '');
    if (!passwordValidation.valid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.errors[0],
        errors: passwordValidation.errors,
      });
      return;
    }

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired. Please request a new one.',
      });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and mark token as used
    await Promise.all([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

// ─── POST /api/auth/refresh ────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token required' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        suspendedUntil: true,
        banReason: true,
      },
    });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!await ensureAccountAccess(user, res)) {
      return;
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ─── GET /api/auth/profile ─────────────────────────────
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        phone: true, role: true, isVerified: true,
        password: true,
        createdAt: true, updatedAt: true,
        providerProfile: {
          select: {
            bio: true,
            availabilityStatus: true,
          }
        },
        kycVerifications: {
          select: {
            status: true,
            fileUrl: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { password, ...publicUser } = user;
    res.json({ success: true, data: { ...toPublicUser(publicUser), hasPassword: !!password } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/auth/profile ─────────────────────────────
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, phone, avatarUrl, bio } = req.body;
    const updateData: any = {};

    // Validate fields if provided
    if (name !== undefined) {
      const nameValidation = validateName(name);
      if (!nameValidation.valid) {
        res.status(400).json({
          success: false,
          message: nameValidation.errors[0],
        });
        return;
      }
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      if (phone) {
        const phoneValidation = validatePhone(phone);
        if (!phoneValidation.valid) {
          res.status(400).json({
            success: false,
            message: phoneValidation.errors[0],
          });
          return;
        }
        updateData.phone = phone.replace(/\D/g, '').slice(-10);
      } else {
        updateData.phone = null;
      }
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

    if (bio !== undefined) {
      updateData.providerProfile = {
        upsert: {
          create: { bio: typeof bio === 'string' ? bio.trim() || null : null },
          update: { bio: typeof bio === 'string' ? bio.trim() || null : null },
        }
      };
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: updateData,
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        phone: true, role: true, isVerified: true,
        createdAt: true, updatedAt: true,
        providerProfile: {
          select: {
            bio: true,
            availabilityStatus: true,
          }
        },
        kycVerifications: {
          select: {
            status: true,
            fileUrl: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
    });

    res.json({ success: true, data: toPublicUser(user) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/auth/change-password ─────────────────────
router.put('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      res.status(400).json({ success: false, message: 'Current password is required' });
      return;
    }

    const passwordValidation = validatePassword(newPassword || '');
    if (!passwordValidation.valid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.errors[0],
        errors: passwordValidation.errors,
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        role: true,
        password: true,
      },
    });

    if (!user || !user.password) {
      res.status(400).json({
        success: false,
        message: 'Cannot change password for Google-only accounts',
      });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Issue fresh tokens so old refresh token doesn't break login
    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: { tokens: { accessToken, refreshToken } },
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// ─── GET /api/auth/stats ───────────────────────────────
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let jobCount = 0;
    let avgRating = 0;
    let reviewCount = 0;

    if (userRole === 'CUSTOMER') {
      [jobCount, reviewCount] = await Promise.all([
        prisma.serviceRequest.count({ where: { customerId: userId } }),
        prisma.rating.count({ where: { raterId: userId } }),
      ]);
      const ratingAgg = await prisma.rating.aggregate({
        where: { rateeId: userId },
        _avg: { overallScore: true },
        _count: true,
      });
      avgRating = ratingAgg._avg.overallScore || 0;
      reviewCount = ratingAgg._count || 0;
    } else {
      const [bidCount, ratingAgg] = await Promise.all([
        prisma.bid.count({ where: { providerId: userId } }),
        prisma.rating.aggregate({
          where: { rateeId: userId },
          _avg: { overallScore: true },
          _count: true,
        }),
      ]);
      jobCount = await prisma.serviceRequest.count({
        where: { selectedProviderId: userId },
      });
      avgRating = ratingAgg._avg.overallScore || 0;
      reviewCount = ratingAgg._count || 0;
    }

    res.json({
      success: true,
      data: {
        jobCount,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
