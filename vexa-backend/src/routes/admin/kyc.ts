import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { logAdminAction } from '../../utils/admin/audit';

const router = Router();

router.use(adminAuthMiddleware);

const parsePage = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const syncUserKycStatus = async (userId: string): Promise<void> => {
  const docs = await prisma.kYCVerification.findMany({
    where: { userId },
    select: { status: true },
  });

  if (docs.length === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: false },
    });
    return;
  }

  const hasRejected = docs.some((doc) => doc.status === 'REJECTED');
  const allApproved = docs.every((doc) => doc.status === 'APPROVED');

  if (hasRejected) {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: false },
    });
    return;
  }

  if (allApproved) {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: false },
  });
};

router.get('/kyc', async (req: Request, res: Response) => {
  try {
    const { status, documentType, search, page = '1', limit = '20' } = req.query;
    const currentPage = parsePage(page, 1);
    const currentLimit = Math.min(parsePage(limit, 20), 100);
    const skip = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (status) {
      where.status = String(status);
    }

    if (documentType) {
      where.documentType = String(documentType);
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.user = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      prisma.kYCVerification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit,
      }),
      prisma.kYCVerification.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      total,
      page: currentPage,
      limit: currentLimit,
      hasMore: skip + items.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/kyc/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.kYCVerification.findUnique({
      where: { id: String(req.params.id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
          },
        },
        reviewLogs: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                adminProfile: {
                  select: {
                    adminRole: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'KYC document not found' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/kyc/:id/approve', async (req: Request, res: Response) => {
  try {
    const { remarks } = req.body as { remarks?: string };
    const item = await prisma.kYCVerification.findUnique({ where: { id: String(req.params.id) } });

    if (!item) {
      res.status(404).json({ success: false, message: 'KYC document not found' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.kYCVerification.update({
        where: { id: item.id },
        data: {
          status: 'APPROVED',
          remarks: remarks || null,
          reviewedById: req.admin!.userId,
          reviewedAt: new Date(),
        },
      });

      await tx.kYCReviewLog.create({
        data: {
          documentId: item.id,
          adminId: req.admin!.userId,
          action: 'APPROVED',
          remarks: remarks || null,
          previousState: item as any,
          newState: next as any,
        },
      });

      return next;
    });

    await syncUserKycStatus(item.userId);

    await logAdminAction({
      entityType: 'KYC_DOCUMENT',
      entityId: item.id,
      action: 'KYC_APPROVED',
      performedById: req.admin!.userId,
      previousState: item,
      newState: updated,
      req,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/kyc/:id/reject', async (req: Request, res: Response) => {
  try {
    const { remarks } = req.body as { remarks?: string };
    const item = await prisma.kYCVerification.findUnique({ where: { id: String(req.params.id) } });

    if (!item) {
      res.status(404).json({ success: false, message: 'KYC document not found' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.kYCVerification.update({
        where: { id: item.id },
        data: {
          status: 'REJECTED',
          remarks: remarks || 'Rejected by admin',
          reviewedById: req.admin!.userId,
          reviewedAt: new Date(),
        },
      });

      await tx.kYCReviewLog.create({
        data: {
          documentId: item.id,
          adminId: req.admin!.userId,
          action: 'REJECTED',
          remarks: remarks || 'Rejected by admin',
          previousState: item as any,
          newState: next as any,
        },
      });

      return next;
    });

    await syncUserKycStatus(item.userId);

    await logAdminAction({
      entityType: 'KYC_DOCUMENT',
      entityId: item.id,
      action: 'KYC_REJECTED',
      performedById: req.admin!.userId,
      previousState: item,
      newState: updated,
      req,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
