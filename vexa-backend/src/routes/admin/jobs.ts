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

type SessionProbe = {
  updatedAt: Date;
  expiresAt: Date;
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const toPresenceStatus = (session?: SessionProbe | null): 'ONLINE' | 'OFFLINE' => {
  if (!session) {
    return 'OFFLINE';
  }

  const now = Date.now();
  const expiresAt = session.expiresAt.getTime();
  const lastTouchedAt = session.updatedAt.getTime();

  if (expiresAt <= now) {
    return 'OFFLINE';
  }

  return now - lastTouchedAt <= ONLINE_WINDOW_MS ? 'ONLINE' : 'OFFLINE';
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
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              accountStatus: true,
              availabilityStatus: true,
              sessions: {
                select: {
                  updatedAt: true,
                  expiresAt: true,
                },
                orderBy: { updatedAt: 'desc' },
                take: 1,
              },
            },
          },
          selectedProvider: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              accountStatus: true,
              availabilityStatus: true,
              sessions: {
                select: {
                  updatedAt: true,
                  expiresAt: true,
                },
                orderBy: { updatedAt: 'desc' },
                take: 1,
              },
            },
          },
          cancellations: {
            include: {
              cancelledBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              bids: true,
              modifications: true,
              payments: true,
              disputes: true,
              ratings: true,
              cancellations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit,
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    const jobsWithSignals = jobs.map((job) => {
      const customerSession = job.customer?.sessions?.[0] || null;
      const providerSession = job.selectedProvider?.sessions?.[0] || null;

      const customer = job.customer
        ? {
            id: job.customer.id,
            name: job.customer.name,
            email: job.customer.email,
            phone: job.customer.phone,
            accountStatus: job.customer.accountStatus,
            availabilityStatus: job.customer.availabilityStatus,
            presenceStatus: toPresenceStatus(customerSession),
          }
        : null;

      const selectedProvider = job.selectedProvider
        ? {
            id: job.selectedProvider.id,
            name: job.selectedProvider.name,
            email: job.selectedProvider.email,
            phone: job.selectedProvider.phone,
            accountStatus: job.selectedProvider.accountStatus,
            availabilityStatus: job.selectedProvider.availabilityStatus,
            presenceStatus: toPresenceStatus(providerSession),
          }
        : null;

      return {
        ...job,
        customer,
        selectedProvider,
        customerPresenceStatus: customer?.presenceStatus || 'OFFLINE',
        providerPresenceStatus: selectedProvider?.presenceStatus || 'OFFLINE',
        latestCancellation: job.cancellations[0] || null,
      };
    });

    res.json({
      success: true,
      data: jobsWithSignals,
      total,
      page: currentPage,
      limit: currentLimit,
      hasMore: skip + jobsWithSignals.length < total,
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
            availabilityStatus: true,
            sessions: {
              select: {
                updatedAt: true,
                expiresAt: true,
              },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
        selectedProvider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            accountStatus: true,
            availabilityStatus: true,
            sessions: {
              select: {
                updatedAt: true,
                expiresAt: true,
              },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
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
        cancellations: {
          include: {
            cancelledBy: {
              select: {
                id: true,
                name: true,
                email: true,
                availabilityStatus: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    const jobCancellations = (((job as any).cancellations || []) as Array<{
      createdAt: Date;
      [key: string]: unknown;
    }>);

    const timeline = [
      { type: 'JOB_CREATED', createdAt: job.createdAt, payload: { status: job.status } },
      ...job.modifications.map((item) => ({ type: 'MODIFICATION', createdAt: item.createdAt, payload: item })),
      ...job.payments.map((item) => ({ type: 'PAYMENT', createdAt: item.createdAt, payload: item })),
      ...job.disputes.map((item) => ({ type: 'DISPUTE', createdAt: item.createdAt, payload: item })),
      ...job.ratings.map((item) => ({ type: 'RATING', createdAt: item.createdAt, payload: item })),
      ...jobCancellations.map((item) => ({ type: 'CANCELLATION', createdAt: item.createdAt, payload: item })),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const normalizedCustomer = job.customer
      ? {
          id: job.customer.id,
          name: job.customer.name,
          email: job.customer.email,
          phone: job.customer.phone,
          accountStatus: job.customer.accountStatus,
          availabilityStatus: job.customer.availabilityStatus,
          presenceStatus: toPresenceStatus(job.customer.sessions[0]),
        }
      : null;

    const normalizedProvider = job.selectedProvider
      ? {
          id: job.selectedProvider.id,
          name: job.selectedProvider.name,
          email: job.selectedProvider.email,
          phone: job.selectedProvider.phone,
          accountStatus: job.selectedProvider.accountStatus,
          availabilityStatus: job.selectedProvider.availabilityStatus,
          presenceStatus: toPresenceStatus(job.selectedProvider.sessions[0]),
        }
      : null;

    res.json({
      success: true,
      data: {
        ...job,
        customer: normalizedCustomer,
        selectedProvider: normalizedProvider,
        customerPresenceStatus: normalizedCustomer?.presenceStatus || 'OFFLINE',
        providerPresenceStatus: normalizedProvider?.presenceStatus || 'OFFLINE',
        latestCancellation: jobCancellations[0] || null,
        timeline,
      },
    });
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
