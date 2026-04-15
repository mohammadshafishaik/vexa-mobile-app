import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';

const router = Router();

router.use(adminAuthMiddleware);

const parsePage = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const {
      entityType,
      action,
      entityId,
      performedById,
      from,
      to,
      page = '1',
      limit = '50',
    } = req.query;

    const currentPage = parsePage(page, 1);
    const currentLimit = Math.min(parsePage(limit, 50), 200);
    const skip = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (entityType) where.entityType = String(entityType);
    if (action) where.action = String(action);
    if (entityId) where.entityId = String(entityId);
    if (performedById) where.performedById = String(performedById);

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              adminRole: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit,
      }),
      prisma.auditLog.count({ where }),
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

router.get('/audit-logs/:id', async (req: Request, res: Response) => {
  try {
    const log = await prisma.auditLog.findUnique({
      where: { id: String(req.params.id) },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            adminRole: true,
          },
        },
      },
    });

    if (!log) {
      res.status(404).json({ success: false, message: 'Audit log not found' });
      return;
    }

    res.json({ success: true, data: log });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
