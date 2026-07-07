import { Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { verifyAdminAccessToken, AdminTokenPayload } from '../../utils/admin/jwt';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Admin token not provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAdminAccessToken(token);

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        adminProfile: { select: { adminRole: true } },
        accountStatus: true,
        suspendedUntil: true,
      },
    });

    if (!adminUser || adminUser.role !== 'ADMIN' || !adminUser.adminProfile?.adminRole) {
      res.status(403).json({ success: false, message: 'Admin access denied' });
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

    req.admin = {
      ...decoded,
      adminRole: adminUser.adminProfile.adminRole as any,
    };

    next();
  } catch (_error) {
    res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
  }
}
