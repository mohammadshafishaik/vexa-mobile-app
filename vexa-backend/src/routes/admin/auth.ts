import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import prisma from '../../lib/prisma';
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  verifyAdminRefreshToken,
  AdminTokenPayload,
} from '../../utils/admin/jwt';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { logAdminAction } from '../../utils/admin/audit';

const router = Router();

const hashToken = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const getRefreshExpiry = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        accountStatus: true,
        suspendedUntil: true,
        adminProfile: {
          select: {
            id: true,
            adminRole: true,
          },
        },
      },
    });

    if (!adminUser || adminUser.role !== 'ADMIN' || !adminUser.adminProfile) {
      res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    if (adminUser.accountStatus === 'BANNED' || adminUser.accountStatus === 'DELETED') {
      res.status(403).json({ success: false, message: 'Admin account is not active' });
      return;
    }

    const suspendedUntil = adminUser.suspendedUntil
      ? new Date(adminUser.suspendedUntil as Date)
      : null;

    if (
      adminUser.accountStatus === 'SUSPENDED'
      && suspendedUntil
      && suspendedUntil.getTime() > Date.now()
    ) {
      res.status(403).json({ success: false, message: 'Admin account is suspended' });
      return;
    }

    if (!adminUser.password) {
      res.status(401).json({ success: false, message: 'Admin password login is required for panel access' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    const sessionId = randomUUID();
    const payload: AdminTokenPayload = {
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
      adminRole: adminUser.adminProfile.adminRole as any,
      sessionId,
    };

    const accessToken = generateAdminAccessToken(payload);
    const refreshToken = generateAdminRefreshToken(payload);

    await prisma.adminSession.create({
      data: {
        id: sessionId,
        adminProfileId: adminUser.adminProfile.id,
        refreshTokenHash: hashToken(refreshToken),
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        expiresAt: getRefreshExpiry(),
      },
    });

    await logAdminAction({
      entityType: 'ADMIN_SESSION',
      entityId: sessionId,
      action: 'ADMIN_LOGIN',
      performedById: adminUser.id,
      req,
      newState: { adminId: adminUser.id },
    });

    res.json({
      success: true,
      data: {
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          adminRole: adminUser.adminProfile.adminRole,
          accountStatus: adminUser.accountStatus,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token is required' });
      return;
    }

    const decoded = verifyAdminRefreshToken(refreshToken);
    const refreshHash = hashToken(refreshToken);

    const existingSession = await prisma.adminSession.findUnique({
      where: { id: decoded.sessionId },
      select: {
        id: true,
        adminProfileId: true,
        refreshTokenHash: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (
      !existingSession
      || existingSession.refreshTokenHash !== refreshHash
      || !!existingSession.revokedAt
      || existingSession.expiresAt <= new Date()
    ) {
      res.status(401).json({ success: false, message: 'Invalid admin session' });
      return;
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        adminProfile: {
          select: {
            id: true,
            adminRole: true,
          },
        },
      },
    });

    if (!adminUser || adminUser.role !== 'ADMIN' || !adminUser.adminProfile || adminUser.accountStatus !== 'ACTIVE' || adminUser.adminProfile.id !== existingSession.adminProfileId) {
      res.status(403).json({ success: false, message: 'Admin account is not active' });
      return;
    }

    const newSessionId = randomUUID();
    const nextPayload: AdminTokenPayload = {
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
      adminRole: adminUser.adminProfile.adminRole as any,
      sessionId: newSessionId,
    };

    const nextAccessToken = generateAdminAccessToken(nextPayload);
    const nextRefreshToken = generateAdminRefreshToken(nextPayload);

    await prisma.$transaction([
      prisma.adminSession.update({
        where: { id: existingSession.id },
        data: { revokedAt: new Date() },
      }),
      prisma.adminSession.create({
        data: {
          id: newSessionId,
          adminProfileId: adminUser.adminProfile.id,
          refreshTokenHash: hashToken(nextRefreshToken),
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
          expiresAt: getRefreshExpiry(),
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      },
    });
  } catch (_error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

router.post('/logout', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.admin?.sessionId) {
      await prisma.adminSession.updateMany({
        where: {
          id: req.admin.sessionId,
          adminProfile: {
            userId: req.admin.userId,
          },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      await logAdminAction({
        entityType: 'ADMIN_SESSION',
        entityId: req.admin.sessionId,
        action: 'ADMIN_LOGOUT',
        performedById: req.admin.userId,
        req,
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.admin!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        adminProfile: {
          select: {
            adminRole: true,
          },
        },
      },
    });

    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin not found' });
      return;
    }

    const formattedAdmin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      adminRole: admin.adminProfile?.adminRole || null,
      accountStatus: admin.accountStatus,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    res.json({ success: true, data: formattedAdmin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
