import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { requireAdminRole } from '../../middleware/admin/requireAdminRole';
import { logAdminAction } from '../../utils/admin/audit';

const router = Router();

router.use(adminAuthMiddleware);

const parsePage = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

router.get('/ratings', async (req: Request, res: Response) => {
  try {
    const { score, raterId, rateeId, jobId, search, page = '1', limit = '20' } = req.query;
    const currentPage = parsePage(page, 1);
    const currentLimit = Math.min(parsePage(limit, 20), 100);
    const skip = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (score) where.score = Number(score);
    if (raterId) where.raterId = String(raterId);
    if (rateeId) where.rateeId = String(rateeId);
    if (jobId) where.jobId = String(jobId);

    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { review: { contains: term, mode: 'insensitive' } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
        { rater: { name: { contains: term, mode: 'insensitive' } } },
        { ratee: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.rating.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              orderId: true,
              title: true,
              category: true,
              status: true,
            },
          },
          rater: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              accountStatus: true,
            },
          },
          ratee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              accountStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit,
      }),
      prisma.rating.count({ where }),
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

router.get('/ratings/overview', async (_req: Request, res: Response) => {
  try {
    const [totalRatings, avgScoreResult, scoreDistribution, lowScoreRecent] = await Promise.all([
      prisma.rating.count(),
      prisma.rating.aggregate({ _avg: { score: true } }),
      prisma.rating.groupBy({
        by: ['score'],
        _count: { score: true },
        orderBy: { score: 'asc' },
      }),
      prisma.rating.findMany({
        where: { score: { lte: 2 } },
        include: {
          job: { select: { id: true, orderId: true, title: true } },
          rater: { select: { id: true, name: true, email: true } },
          ratee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalRatings,
        averageScore: avgScoreResult._avg.score || 0,
        scoreDistribution,
        lowScoreRecent,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ratings/:id', async (req: Request, res: Response) => {
  try {
    const rating = await prisma.rating.findUnique({
      where: { id: String(req.params.id) },
      include: {
        job: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            selectedProvider: { select: { id: true, name: true, email: true } },
          },
        },
        rater: { select: { id: true, name: true, email: true, role: true } },
        ratee: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!rating) {
      res.status(404).json({ success: false, message: 'Rating not found' });
      return;
    }

    res.json({ success: true, data: rating });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/ratings/:id', async (req: Request, res: Response) => {
  try {
    const { review, score } = req.body as { review?: string; score?: number };

    if (review === undefined && score === undefined) {
      res.status(400).json({ success: false, message: 'At least one of review or score is required' });
      return;
    }

    if (score !== undefined && (!Number.isInteger(score) || score < 1 || score > 5)) {
      res.status(400).json({ success: false, message: 'score must be an integer between 1 and 5' });
      return;
    }

    const existing = await prisma.rating.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Rating not found' });
      return;
    }

    const updated = await prisma.rating.update({
      where: { id: String(req.params.id) },
      data: {
        review: review !== undefined ? review : existing.review,
        score: score !== undefined ? score : existing.score,
      },
    });

    await logAdminAction({
      entityType: 'RATING',
      entityId: existing.id,
      action: 'RATING_MODERATED',
      performedById: req.admin!.userId,
      previousState: existing,
      newState: updated,
      req,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/ratings/:id', requireAdminRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.rating.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Rating not found' });
      return;
    }

    await prisma.rating.delete({ where: { id: String(req.params.id) } });

    await logAdminAction({
      entityType: 'RATING',
      entityId: existing.id,
      action: 'RATING_DELETED',
      performedById: req.admin!.userId,
      previousState: existing,
      req,
    });

    res.json({ success: true, data: { id: existing.id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
