import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import {
  validateRegistration,
  validateLogin,
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
} from '../utils/validation';

const router = Router();

// ─── POST /api/auth/register ───────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, phone, role, password } = req.body;

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

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone ? phone.replace(/\D/g, '').slice(-10) : null,
        role,
        password: hashedPassword,
        isVerified: true,
      },
    });

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
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
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
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

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
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
    });

    if (user) {
      // Update googleId if not set (email match)
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatarUrl: user.avatarUrl || photoUrl || null },
        });
      }
    } else {
      // Create new user — will need role selection
      user = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name || email.split('@')[0],
          googleId,
          avatarUrl: photoUrl || null,
          isVerified: true,
          role: 'CUSTOMER', // Default, can be changed later
        },
      });
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { password: _, ...userWithoutPassword } = user;

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
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
});

// ─── POST /api/auth/forgot-password ────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
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

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
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

    // In development, log the token. In production, send email.
    console.log(`\n📧 Password Reset Token for ${email}:`);
    console.log(`   Token: ${token}`);
    console.log(`   Expires: ${expiresAt.toISOString()}\n`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Include token in dev mode for testing
      ...(process.env.NODE_ENV !== 'production' && { resetToken: token }),
    });
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
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
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
        phone: true, role: true, isVerified: true, googleId: true,
        createdAt: true, updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: { ...user, hasPassword: !!user } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/auth/profile ─────────────────────────────
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, phone, avatarUrl } = req.body;
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

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: updateData,
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        phone: true, role: true, isVerified: true,
        createdAt: true, updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
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

    res.json({ success: true, message: 'Password changed successfully' });
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
        _avg: { score: true },
        _count: true,
      });
      avgRating = ratingAgg._avg.score || 0;
      reviewCount = ratingAgg._count || 0;
    } else {
      const [bidCount, ratingAgg] = await Promise.all([
        prisma.bid.count({ where: { providerId: userId } }),
        prisma.rating.aggregate({
          where: { rateeId: userId },
          _avg: { score: true },
          _count: true,
        }),
      ]);
      jobCount = await prisma.serviceRequest.count({
        where: { selectedProviderId: userId },
      });
      avgRating = ratingAgg._avg.score || 0;
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
