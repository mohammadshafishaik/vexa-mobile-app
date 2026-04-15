import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { logAdminAction } from '../../utils/admin/audit';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/bidding/active-jobs', async (_req: Request, res: Response) => {
  try {
    const jobs = await prisma.serviceRequest.findMany({
      where: { status: 'BIDDING' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        bids: {
          include: {
            provider: { select: { id: true, name: true, email: true } },
          },
          orderBy: { amount: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const enriched = jobs.map((job) => {
      const amounts = job.bids.map((bid) => bid.amount);
      const minBid = amounts.length ? Math.min(...amounts) : null;
      const maxBid = amounts.length ? Math.max(...amounts) : null;
      return {
        ...job,
        stats: {
          bidCount: job.bids.length,
          minBid,
          maxBid,
          spread: minBid !== null && maxBid !== null ? maxBid - minBid : null,
        },
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bidding/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const job = await prisma.serviceRequest.findUnique({
      where: { id: String(req.params.jobId) },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        bids: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                accountStatus: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        bidAnomalies: {
          include: {
            provider: { select: { id: true, name: true, email: true } },
            reviewedBy: { select: { id: true, name: true, email: true, adminRole: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Bidding job not found' });
      return;
    }

    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bidding/anomalies', async (req: Request, res: Response) => {
  try {
    const { status, anomalyType, jobId, providerId } = req.query;
    const where: any = {};

    if (status) where.status = String(status);
    if (anomalyType) where.anomalyType = String(anomalyType);
    if (jobId) where.jobId = String(jobId);
    if (providerId) where.providerId = String(providerId);

    const items = await prisma.bidAnomaly.findMany({
      where,
      include: {
        job: { select: { id: true, orderId: true, title: true, status: true } },
        bid: {
          select: {
            id: true,
            amount: true,
            message: true,
            updatedAt: true,
          },
        },
        provider: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true, adminRole: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/bidding/anomalies', async (req: Request, res: Response) => {
  try {
    const {
      jobId,
      bidId,
      providerId,
      anomalyType,
      severityScore,
      reason,
      metadata,
    } = req.body as {
      jobId?: string;
      bidId?: string;
      providerId?: string;
      anomalyType?: 'RAPID_REBID' | 'EXTREME_UNDERCUT' | 'COLLUSION_PATTERN' | 'OTHER';
      severityScore?: number;
      reason?: string;
      metadata?: unknown;
    };

    if (!jobId || !anomalyType || !reason) {
      res.status(400).json({ success: false, message: 'jobId, anomalyType and reason are required' });
      return;
    }

    const created = await prisma.bidAnomaly.create({
      data: {
        jobId,
        bidId: bidId || null,
        providerId: providerId || null,
        anomalyType,
        severityScore: Number.isFinite(severityScore) ? Number(severityScore) : 60,
        reason,
        metadata: (metadata as any) || undefined,
      },
    });

    await logAdminAction({
      entityType: 'BID_ANOMALY',
      entityId: created.id,
      action: 'BID_ANOMALY_CREATED',
      performedById: req.admin!.userId,
      newState: created,
      req,
    });

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/bidding/anomalies/scan', async (_req: Request, res: Response) => {
  try {
    const activeJobs = await prisma.serviceRequest.findMany({
      where: { status: 'BIDDING' },
      include: {
        bids: {
          orderBy: { amount: 'asc' },
          include: {
            provider: { select: { id: true } },
          },
        },
      },
      take: 200,
    });

    const created: Array<{ jobId: string; anomalyType: string; reason: string }> = [];

    for (const job of activeJobs) {
      if (job.bids.length < 2) continue;

      const amounts = job.bids.map((bid) => bid.amount).sort((a, b) => a - b);
      const lowest = amounts[0];
      const median = amounts[Math.floor(amounts.length / 2)];

      if (median > 0 && lowest <= median * 0.6) {
        const existing = await prisma.bidAnomaly.findFirst({
          where: {
            jobId: job.id,
            anomalyType: 'EXTREME_UNDERCUT',
            status: { in: ['OPEN', 'REVIEWED'] },
          },
          select: { id: true },
        });

        if (!existing) {
          await prisma.bidAnomaly.create({
            data: {
              jobId: job.id,
              bidId: job.bids[0]?.id || null,
              providerId: job.bids[0]?.providerId || null,
              anomalyType: 'EXTREME_UNDERCUT',
              severityScore: 80,
              reason: 'Lowest bid is more than 40% lower than median bid',
              metadata: {
                median,
                lowest,
                totalBids: job.bids.length,
              } as any,
            },
          });

          created.push({
            jobId: job.id,
            anomalyType: 'EXTREME_UNDERCUT',
            reason: 'Lowest bid is more than 40% lower than median bid',
          });
        }
      }

      const uniqueProviders = new Set(job.bids.map((bid) => bid.providerId));
      if (uniqueProviders.size <= 2 && job.bids.length >= 6) {
        const existing = await prisma.bidAnomaly.findFirst({
          where: {
            jobId: job.id,
            anomalyType: 'COLLUSION_PATTERN',
            status: { in: ['OPEN', 'REVIEWED'] },
          },
          select: { id: true },
        });

        if (!existing) {
          await prisma.bidAnomaly.create({
            data: {
              jobId: job.id,
              anomalyType: 'COLLUSION_PATTERN',
              severityScore: 70,
              reason: 'High bid activity concentrated among very few providers',
              metadata: {
                providers: uniqueProviders.size,
                totalBids: job.bids.length,
              } as any,
            },
          });

          created.push({
            jobId: job.id,
            anomalyType: 'COLLUSION_PATTERN',
            reason: 'High bid activity concentrated among very few providers',
          });
        }
      }
    }

    res.json({ success: true, data: { createdCount: created.length, created } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/bidding/anomalies/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, remarks } = req.body as { status?: 'OPEN' | 'REVIEWED' | 'RESOLVED'; remarks?: string };

    if (!status || !['OPEN', 'REVIEWED', 'RESOLVED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Valid status is required' });
      return;
    }

    const previous = await prisma.bidAnomaly.findUnique({ where: { id: String(req.params.id) } });
    if (!previous) {
      res.status(404).json({ success: false, message: 'Anomaly not found' });
      return;
    }

    const updated = await prisma.bidAnomaly.update({
      where: { id: String(req.params.id) },
      data: {
        status,
        reviewedById: req.admin!.userId,
        reviewedAt: new Date(),
        metadata: {
          ...(previous.metadata as Record<string, unknown> || {}),
          adminRemarks: remarks || null,
        } as any,
      },
    });

    await logAdminAction({
      entityType: 'BID_ANOMALY',
      entityId: previous.id,
      action: `BID_ANOMALY_${status}`,
      performedById: req.admin!.userId,
      previousState: previous,
      newState: updated,
      req,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
