import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { getAccountAccessBlock, shouldAutoReactivateSuspendedAccount } from '../utils/accountStatus';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        accountStatus: true,
        suspendedUntil: true,
        banReason: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    let effectiveStatus = user.accountStatus;
    let effectiveSuspendedUntil = user.suspendedUntil;

    if (shouldAutoReactivateSuspendedAccount(user as any)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accountStatus: 'ACTIVE',
          suspendedUntil: null,
          banReason: null,
        },
      });

      effectiveStatus = 'ACTIVE';
      effectiveSuspendedUntil = null;
    }

    const accessBlock = getAccountAccessBlock({
      accountStatus: effectiveStatus as any,
      suspendedUntil: effectiveSuspendedUntil,
      banReason: user.banReason,
    });

    if (accessBlock) {
      res.status(accessBlock.statusCode).json({
        success: false,
        code: accessBlock.code,
        message: accessBlock.message,
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
