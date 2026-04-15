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

router.get('/payments', async (req: Request, res: Response) => {
  try {
    const { status, paymentMethod, jobId, search, page = '1', limit = '20' } = req.query;
    const currentPage = parsePage(page, 1);
    const currentLimit = Math.min(parsePage(limit, 20), 100);
    const skip = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (status) where.status = String(status);
    if (paymentMethod) where.paymentMethod = String(paymentMethod);
    if (jobId) where.jobId = String(jobId);

    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { razorpayOrderId: { contains: term, mode: 'insensitive' } },
        { razorpayPaymentId: { contains: term, mode: 'insensitive' } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
        { job: { orderId: { contains: term, mode: 'insensitive' } } },
        { payer: { name: { contains: term, mode: 'insensitive' } } },
        { payee: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              orderId: true,
              title: true,
              status: true,
              category: true,
              customerId: true,
              selectedProviderId: true,
            },
          },
          payer: {
            select: {
              id: true,
              name: true,
              email: true,
              accountStatus: true,
            },
          },
          payee: {
            select: {
              id: true,
              name: true,
              email: true,
              accountStatus: true,
            },
          },
          actionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  adminRole: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit,
      }),
      prisma.payment.count({ where }),
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

router.get('/payments/:id', async (req: Request, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: String(req.params.id) },
      include: {
        job: {
          include: {
            customer: { select: { id: true, name: true, email: true, accountStatus: true } },
            selectedProvider: { select: { id: true, name: true, email: true, accountStatus: true } },
            disputes: {
              select: {
                id: true,
                status: true,
                reason: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        payer: { select: { id: true, name: true, email: true } },
        payee: { select: { id: true, name: true, email: true } },
        actionLogs: {
          include: {
            admin: { select: { id: true, name: true, email: true, adminRole: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/payments/:id/action', async (req: Request, res: Response) => {
  try {
    const {
      action,
      reason,
      metadata,
    } = req.body as {
      action?: 'MARK_PROCESSING' | 'MARK_COMPLETED' | 'MARK_FAILED' | 'REFUND';
      reason?: string;
      metadata?: unknown;
    };

    if (!action || !['MARK_PROCESSING', 'MARK_COMPLETED', 'MARK_FAILED', 'REFUND'].includes(action)) {
      res.status(400).json({ success: false, message: 'Valid action is required' });
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { id: String(req.params.id) },
      include: { job: true },
    });

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    const statusMap: Record<'MARK_PROCESSING' | 'MARK_COMPLETED' | 'MARK_FAILED' | 'REFUND', 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'> = {
      MARK_PROCESSING: 'PROCESSING',
      MARK_COMPLETED: 'COMPLETED',
      MARK_FAILED: 'FAILED',
      REFUND: 'REFUNDED',
    };

    const nextStatus = statusMap[action];

    const updated = await prisma.$transaction(async (tx) => {
      const nextPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: nextStatus },
      });

      if (action === 'MARK_COMPLETED') {
        await tx.serviceRequest.update({
          where: { id: payment.jobId },
          data: { status: 'PAID' },
        });
      }

      await tx.paymentActionLog.create({
        data: {
          paymentId: payment.id,
          adminId: req.admin!.userId,
          action,
          metadata: {
            reason: reason || null,
            inputMetadata: (metadata as any) || null,
            previousStatus: payment.status,
            nextStatus,
          } as any,
        },
      });

      return nextPayment;
    });

    await logAdminAction({
      entityType: 'PAYMENT',
      entityId: payment.id,
      action: `PAYMENT_${action}`,
      performedById: req.admin!.userId,
      previousState: { status: payment.status },
      newState: { status: updated.status, reason: reason || null },
      req,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/payments/integrity/scan', async (_req: Request, res: Response) => {
  try {
    const [completedPayments, paidJobs] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        include: {
          job: {
            select: {
              id: true,
              orderId: true,
              title: true,
              status: true,
            },
          },
        },
        take: 2000,
      }),
      prisma.serviceRequest.findMany({
        where: { status: 'PAID' },
        select: {
          id: true,
          orderId: true,
          title: true,
          status: true,
          payments: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        take: 2000,
      }),
    ]);

    const completedButJobNotPaid = completedPayments.filter((payment) => payment.job.status !== 'PAID');

    const paidButNoCompletedPayment = paidJobs.filter((job) => !job.payments.some((payment) => payment.status === 'COMPLETED'));

    res.json({
      success: true,
      data: {
        totalCompletedPayments: completedPayments.length,
        totalPaidJobs: paidJobs.length,
        completedButJobNotPaid,
        paidButNoCompletedPayment,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
