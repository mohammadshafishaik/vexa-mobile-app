import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';
import { createAndPushNotification } from '../utils/notificationHelper';

const router = Router();

// Fee rates from environment or defaults
const getFeeRates = () => ({
  preInspection: Number(process.env.CANCELLATION_FEE_PRE_INSPECTION) || 0.10,
  postArrival: Number(process.env.CANCELLATION_FEE_POST_ARRIVAL) || 0.25,
  providerFlatFee: Number(process.env.CANCELLATION_FLAT_FEE_PROVIDER) || 200,
});

// Calculate cancellation fee based on job status and who's cancelling
const calculateCancellationFee = (
  jobStatus: string,
  initiator: string,
  bidAmount: number,
): { fee: number; ratingPenalty: boolean } => {
  const rates = getFeeRates();

  // Customer cancels before any bid is accepted
  if (initiator === 'CUSTOMER' && ['POSTED', 'BIDDING'].includes(jobStatus)) {
    return { fee: 0, ratingPenalty: false };
  }

  // Customer cancels after provider accepted but before inspection
  if (initiator === 'CUSTOMER' && jobStatus === 'ACCEPTED') {
    return { fee: Math.round(bidAmount * rates.preInspection), ratingPenalty: false };
  }

  // Customer cancels after provider reaches site
  if (initiator === 'CUSTOMER' && ['ON_SITE_INSPECTION', 'IN_PROGRESS'].includes(jobStatus)) {
    return { fee: Math.round(bidAmount * rates.postArrival), ratingPenalty: false };
  }

  // Provider cancels after accepting
  if (initiator === 'PROVIDER' && ['ACCEPTED', 'ON_SITE_INSPECTION', 'IN_PROGRESS'].includes(jobStatus)) {
    return { fee: rates.providerFlatFee, ratingPenalty: true };
  }

  return { fee: 0, ratingPenalty: false };
};

// ─── POST /api/cancellations/:jobId — cancel a job ──────
router.post('/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const jobId = req.params.jobId as string;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      res.status(400).json({ success: false, message: 'A cancellation reason is required (min 5 chars)' });
      return;
    }

    const job = await prisma.serviceRequest.findUnique({
      where: { id: jobId },
      include: {
        customer: { select: { id: true, name: true } },
        selectedProvider: { select: { id: true, name: true } },
        bids: { where: { isSelected: true }, take: 1 },
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    // Verify the user is a participant
    if (job.customerId !== userId && job.selectedProviderId !== userId) {
      res.status(403).json({ success: false, message: 'You are not a participant in this job' });
      return;
    }

    // Cannot cancel already completed/paid/cancelled jobs
    if (['COMPLETED', 'PAYMENT_PENDING', 'PAID', 'CANCELLED'].includes(job.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot cancel a job with status "${job.status}"`,
      });
      return;
    }

    const initiator = job.customerId === userId ? 'CUSTOMER' : 'PROVIDER';
    const bidAmount = job.bids[0]?.amount || job.revisedPrice || job.originalPrice;
    const { fee, ratingPenalty } = calculateCancellationFee(job.status, initiator, bidAmount);

    // Create cancellation record and update job in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const cancellation = await tx.cancellation.create({
        data: {
          jobId,
          cancelledById: userId,
          initiator: initiator as any,
          reason: reason.trim(),
          cancellationFee: fee,
          ratingPenalty,
        },
      });

      const updatedJob = await tx.serviceRequest.update({
        where: { id: jobId },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason.trim(),
          cancellationFee: fee,
        },
        include: {
          customer: { select: { id: true, name: true } },
          selectedProvider: { select: { id: true, name: true } },
        },
      });

      return { cancellation, updatedJob };
    });

    // Notify the other party
    const otherUserId = initiator === 'CUSTOMER'
      ? job.selectedProviderId
      : job.customerId;

    if (otherUserId) {
      const cancellerName = initiator === 'CUSTOMER' ? job.customer.name : job.selectedProvider?.name;
      try {
        await createAndPushNotification({
          userId: otherUserId,
          type: 'CANCELLATION',
          title: 'Job Cancelled ❌',
          body: `${cancellerName} cancelled "${job.title}"${fee > 0 ? `. Cancellation fee: ₹${fee}` : ''}`,
          data: {
            jobId,
            cancellationId: result.cancellation.id,
            fee,
          },
        });
      } catch (e) {}
    }

    try {
      getIO().emit('job:statusChange', { jobId, status: 'CANCELLED', job: result.updatedJob });
    } catch (e) {}

    res.json({
      success: true,
      data: {
        cancellation: result.cancellation,
        job: result.updatedJob,
        feeApplied: fee,
        ratingPenalty,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/cancellations/history/my — get cancellation history ──
router.get('/history/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [cancellations, total] = await Promise.all([
      prisma.cancellation.findMany({
        where: { cancelledById: req.user!.userId },
        include: {
          job: { select: { id: true, title: true, orderId: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.cancellation.count({ where: { cancelledById: req.user!.userId } }),
    ]);

    res.json({
      success: true,
      data: cancellations,
      total,
      page: Number(page),
      limit: Number(limit),
      hasMore: skip + cancellations.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/cancellations/:jobId — get cancellation details ──
router.get('/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const cancellation = await prisma.cancellation.findFirst({
      where: { jobId: req.params.jobId as string },
      include: {
        cancelledBy: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!cancellation) {
      res.status(404).json({ success: false, message: 'No cancellation record found' });
      return;
    }

    res.json({ success: true, data: cancellation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
