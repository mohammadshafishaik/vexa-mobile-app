import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { logAdminAction } from '../../utils/admin/audit';
import { createAndPushNotification } from '../../utils/notificationHelper';
import { sendDisputeUpdateEmail } from '../../lib/email';

const router = Router();

router.use(adminAuthMiddleware);

const parsePage = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

router.get('/disputes', async (req: Request, res: Response) => {
  try {
    const { status, jobId, raisedById, search, page = '1', limit = '20' } = req.query;
    const currentPage = parsePage(page, 1);
    const currentLimit = Math.min(parsePage(limit, 20), 100);
    const skip = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (status) where.status = String(status);
    if (jobId) where.jobId = String(jobId);
    if (raisedById) where.raisedById = String(raisedById);

    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { reason: { contains: term, mode: 'insensitive' } },
        { resolution: { contains: term, mode: 'insensitive' } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
        { job: { orderId: { contains: term, mode: 'insensitive' } } },
        { raisedBy: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              orderId: true,
              title: true,
              status: true,
              customerId: true,
              selectedProviderId: true,
            },
          },
          raisedBy: { select: { id: true, name: true, email: true, role: true } },
          resolvedBy: { select: { id: true, name: true, email: true, adminProfile: { select: { adminRole: true } } } },
          decisions: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              resolvedBy: { select: { id: true, name: true, email: true, adminProfile: { select: { adminRole: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit,
      }),
      prisma.dispute.count({ where }),
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

router.get('/disputes/:id', async (req: Request, res: Response) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: String(req.params.id) },
      include: {
        job: {
          include: {
            customer: { select: { id: true, name: true, email: true, accountStatus: true } },
            selectedProvider: { select: { id: true, name: true, email: true, accountStatus: true } },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                paymentMethod: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        raisedBy: { select: { id: true, name: true, email: true, role: true } },
        resolvedBy: { select: { id: true, name: true, email: true, adminProfile: { select: { adminRole: true } } } },
        decisions: {
          include: {
            resolvedBy: {
              select: { id: true, name: true, email: true, adminProfile: { select: { adminRole: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!dispute) {
      res.status(404).json({ success: false, message: 'Dispute not found' });
      return;
    }

    res.json({ success: true, data: dispute });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/disputes/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, remarks } = req.body as { status?: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED'; remarks?: string };

    if (!status || !['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Valid status is required' });
      return;
    }

    const previous = await prisma.dispute.findUnique({
      where: { id: String(req.params.id) },
      include: { raisedBy: true, job: true },
    });
    if (!previous) {
      res.status(404).json({ success: false, message: 'Dispute not found' });
      return;
    }

    const updated = await prisma.dispute.update({
      where: { id: String(req.params.id) },
      data: {
        status,
        resolution: remarks || previous.resolution,
        resolvedById: status === 'RESOLVED' ? req.admin!.userId : previous.resolvedById,
      },
    });

    await logAdminAction({
      entityType: 'DISPUTE',
      entityId: previous.id,
      action: `DISPUTE_STATUS_${status}`,
      performedById: req.admin!.userId,
      previousState: previous,
      newState: updated,
      req,
    });

    if (previous && previous.raisedBy) {
      sendDisputeUpdateEmail(previous.raisedBy.email, {
        name: previous.raisedBy.name,
        jobTitle: previous.job.title,
        orderId: previous.job.orderId,
        disputeStatus: status,
        updateMessage: remarks || `Dispute status updated to ${status.replace(/_/g, ' ')}`,
      }).catch(err => console.error('Failed to send dispute update email:', err));
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/disputes/:id/decision', async (req: Request, res: Response) => {
  try {
    const {
      decision,
      refundAmount,
      remarks,
      metadata,
    } = req.body as {
      decision?: 'REFUND' | 'PARTIAL_SETTLEMENT' | 'REJECT';
      refundAmount?: number;
      remarks?: string;
      metadata?: unknown;
    };

    if (!decision || !['REFUND', 'PARTIAL_SETTLEMENT', 'REJECT'].includes(decision)) {
      res.status(400).json({ success: false, message: 'Valid dispute decision is required' });
      return;
    }

    if (decision === 'PARTIAL_SETTLEMENT' && (!Number.isFinite(refundAmount) || Number(refundAmount) <= 0)) {
      res.status(400).json({ success: false, message: 'refundAmount must be provided for PARTIAL_SETTLEMENT' });
      return;
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: String(req.params.id) },
      include: {
        job: {
          include: {
            payments: {
              where: { status: { in: ['COMPLETED', 'PROCESSING'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!dispute) {
      res.status(404).json({ success: false, message: 'Dispute not found' });
      return;
    }

    if (dispute.status === 'RESOLVED') {
      res.status(409).json({ success: false, message: 'Dispute is already resolved' });
      return;
    }

    const activePayment = dispute.job.payments[0] || null;

    const result = await prisma.$transaction(async (tx) => {
      const resolution = await tx.disputeResolution.create({
        data: {
          disputeId: dispute.id,
          jobId: dispute.jobId,
          decision: decision as any,
          refundAmount: Number.isFinite(refundAmount) ? Number(refundAmount) : null,
          remarks: remarks || null,
          resolvedById: req.admin!.userId,
          metadata: (metadata as any) || null,
        },
      });

      const nextDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          resolution: remarks || `Decision: ${decision}`,
          resolvedById: req.admin!.userId,
        },
      });

      if (activePayment && (decision === 'REFUND' || decision === 'PARTIAL_SETTLEMENT')) {
        await tx.payment.update({
          where: { id: activePayment.id },
          data: {
            status: decision === 'REFUND' ? 'REFUNDED' : activePayment.status,
          },
        });

        await tx.paymentActionLog.create({
          data: {
            paymentId: activePayment.id,
            adminId: req.admin!.userId,
            action: decision === 'REFUND' ? 'DISPUTE_REFUND' : 'DISPUTE_PARTIAL_SETTLEMENT',
            metadata: {
              disputeId: dispute.id,
              resolutionId: resolution.id,
              refundAmount: Number.isFinite(refundAmount) ? Number(refundAmount) : null,
              remarks: remarks || null,
            } as any,
          },
        });
      }

      return { resolution, dispute: nextDispute };
    });

    // Notify customer & provider outside the transaction
    try {
      await createAndPushNotification({
        userId: dispute.job.customerId,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute resolved',
        body: `Dispute for "${dispute.job.title}" resolved: ${decision}`,
        data: { disputeId: dispute.id, jobId: dispute.jobId, decision },
      });
      if (dispute.job.selectedProviderId) {
        await createAndPushNotification({
          userId: dispute.job.selectedProviderId,
          type: 'DISPUTE_RESOLVED',
          title: 'Dispute resolved',
          body: `Dispute for "${dispute.job.title}" resolved: ${decision}`,
          data: { disputeId: dispute.id, jobId: dispute.jobId, decision },
        });
      }
    } catch (e) {
      console.error('Error sending dispute resolved notifications:', e);
    }

    await logAdminAction({
      entityType: 'DISPUTE',
      entityId: dispute.id,
      action: `DISPUTE_DECISION_${decision}`,
      performedById: req.admin!.userId,
      previousState: dispute,
      newState: result,
      req,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
