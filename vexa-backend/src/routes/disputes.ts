import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { createAndPushNotification } from '../utils/notificationHelper';

const router = Router();

// ─── POST /api/disputes — raise a dispute ──────────────────
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId, reason, evidence } = req.body;

    if (!jobId || !reason) {
      res.status(400).json({ success: false, message: 'jobId and reason are required' });
      return;
    }

    const job = await prisma.serviceRequest.findUnique({
      where: { id: jobId },
      include: { customer: true, selectedProvider: true },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    // Only customer or provider can raise disputes
    const isCustomer = job.customerId === req.user!.userId;
    const isProvider = job.selectedProviderId === req.user!.userId;
    if (!isCustomer && !isProvider) {
      res.status(403).json({ success: false, message: 'Only the customer or assigned provider can raise a dispute' });
      return;
    }

    const dispute = await prisma.dispute.create({
      data: {
        jobId,
        raisedById: req.user!.userId,
        reason,
        evidence: evidence || [],
        status: 'OPEN',
      },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    // Update job status to UNDER_DISPUTE
    await prisma.serviceRequest.update({
      where: { id: jobId },
      data: { status: 'UNDER_DISPUTE' },
    });

    // Notify the other party
    const otherPartyId = isCustomer ? job.selectedProviderId : job.customerId;
    if (otherPartyId) {
      await createAndPushNotification({
        userId: otherPartyId,
        type: 'DISPUTE_OPENED',
        title: 'Dispute Raised ⚠️',
        body: `A dispute has been raised for "${job.title}": ${reason}`,
        data: { jobId, disputeId: dispute.id },
      });
    }

    res.status(201).json({ success: true, data: dispute });
  } catch (error: any) {
    console.error('[Disputes] create error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/disputes — list disputes ──────────────────
// Admin sees all; users see their own
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const isAdmin = user?.role === 'ADMIN';

    const where = isAdmin
      ? {}
      : {
          OR: [
            { raisedById: req.user!.userId },
            { job: { customerId: req.user!.userId } },
            { job: { selectedProviderId: req.user!.userId } },
          ],
        };

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        job: { select: { id: true, title: true, status: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: disputes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/disputes/:id/resolve — admin resolves a dispute ──────
router.patch('/:id/resolve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { resolution } = req.body;
    const disputeId = req.params.id as string;

    // Verify admin
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (user?.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Only admins can resolve disputes' });
      return;
    }

    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution: resolution || 'Resolved by admin',
        resolvedById: req.user!.userId,
      },
      include: {
        raisedBy: { select: { id: true, name: true } },
        job: { select: { id: true, title: true, customerId: true, selectedProviderId: true } },
      },
    });

    // Notify both parties
    const ids = [dispute.job.customerId, dispute.job.selectedProviderId].filter(Boolean) as string[];
    for (const uid of ids) {
      await createAndPushNotification({
        userId: uid,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved ✅',
        body: `The dispute for "${dispute.job.title}" has been resolved: ${resolution || 'Resolved'}`,
        data: { jobId: dispute.job.id, disputeId: dispute.id },
      });
    }

    res.json({ success: true, data: dispute });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
