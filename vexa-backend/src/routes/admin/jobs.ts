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

router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const { status, category, search, page = '1', limit = '20' } = req.query;
    const currentPage = parsePage(page, 1);
    const currentLimit = Math.min(parsePage(limit, 20), 100);
    const skip = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (status) where.status = String(status);
    if (category) where.category = String(category);

    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { orderId: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { selectedProvider: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          selectedProvider: { select: { id: true, name: true, email: true, phone: true } },
          _count: {
            select: {
              bids: true,
              modifications: true,
              payments: true,
              disputes: true,
              ratings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit,
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: jobs,
      total,
      page: currentPage,
      limit: currentLimit,
      hasMore: skip + jobs.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.serviceRequest.findUnique({
      where: { id: String(req.params.id) },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
        selectedProvider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
        bids: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { amount: 'asc' },
        },
        modifications: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          include: {
            payer: { select: { id: true, name: true, email: true } },
            payee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        disputes: {
          include: {
            raisedBy: { select: { id: true, name: true, email: true } },
            resolvedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        ratings: {
          include: {
            rater: { select: { id: true, name: true, email: true } },
            ratee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    const timeline = [
      { type: 'JOB_CREATED', createdAt: job.createdAt, payload: { status: job.status } },
      ...job.modifications.map((item) => ({ type: 'MODIFICATION', createdAt: item.createdAt, payload: item })),
      ...job.payments.map((item) => ({ type: 'PAYMENT', createdAt: item.createdAt, payload: item })),
      ...job.disputes.map((item) => ({ type: 'DISPUTE', createdAt: item.createdAt, payload: item })),
      ...job.ratings.map((item) => ({ type: 'RATING', createdAt: item.createdAt, payload: item })),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    res.json({ success: true, data: { ...job, timeline } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/jobs/:id/flag', async (req: Request, res: Response) => {
  try {
    const { reason, metadata } = req.body as { reason?: string; metadata?: unknown };

    const job = await prisma.serviceRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    await logAdminAction({
      entityType: 'JOB',
      entityId: job.id,
      action: 'JOB_FLAGGED',
      performedById: req.admin!.userId,
      previousState: { status: job.status },
      newState: {
        flaggedReason: reason || 'Flagged by admin',
        metadata: metadata || null,
      },
      req,
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        reason: reason || 'Flagged by admin',
        metadata: metadata || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
