import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';
import { createAndPushNotification } from '../utils/notificationHelper';

const router = Router();

// ─── POST /api/bids — place a bid ────────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId, amount, message, estimatedDuration } = req.body;

    if (!jobId || !amount || !message || !estimatedDuration) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    // Check job exists and is in BIDDING status
    const job = await prisma.serviceRequest.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    if (job.status !== 'BIDDING' && job.status !== 'POSTED') {
      res.status(400).json({ success: false, message: 'Job is not accepting bids' });
      return;
    }

    // Prevent customer from bidding on their own job
    if (job.customerId === req.user!.userId) {
      res.status(403).json({ success: false, message: 'You cannot bid on your own job' });
      return;
    }

    // Check if provider already bid
    const existingBid = await prisma.bid.findUnique({
      where: { jobId_providerId: { jobId, providerId: req.user!.userId } },
    });
    if (existingBid) {
      res.status(409).json({ success: false, message: 'You already placed a bid on this job' });
      return;
    }

    const bid = await prisma.bid.create({
      data: {
        jobId,
        providerId: req.user!.userId,
        amount: Number(amount),
        message,
        estimatedDuration,
      },
      include: {
        provider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
      },
    });

    // Update job status to BIDDING if it was POSTED
    if (job.status === 'POSTED') {
      await prisma.serviceRequest.update({
        where: { id: jobId },
        data: { status: 'BIDDING' },
      });
    }

    // ─── Real-time notification to customer (DB + Socket.IO) ───
    await createAndPushNotification({
      userId: job.customerId,
      type: 'BID_RECEIVED',
      title: 'New Bid Received 🔔',
      body: `${bid.provider.name} bid ₹${bid.amount} on "${job.title}"`,
      data: { jobId, bidId: bid.id, providerName: bid.provider.name, amount: bid.amount },
    });

    // Broadcast new bid to the bidding room (live UI update)
    try {
      getIO().to(`bidding:${jobId}`).emit('bid:new', bid);
      getIO().emit('job:bidUpdate', { jobId, bid });
    } catch (e) {}

    res.status(201).json({ success: true, data: bid });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/bids/job/:jobId — get bids for a job ───────
router.get('/job/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bids = await prisma.bid.findMany({
      where: { jobId: req.params.jobId as string },
      include: {
        provider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
      },
      orderBy: { amount: 'asc' },
    });

    res.json({ success: true, data: bids });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/bids/my — get my bids as a provider ────────
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where: { providerId: req.user!.userId },
        include: {
          job: {
            select: {
              id: true, title: true, category: true, location: true,
              originalPrice: true, revisedPrice: true, status: true,
              customer: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.bid.count({ where: { providerId: req.user!.userId } }),
    ]);

    res.json({
      success: true,
      data: bids,
      total,
      page: Number(page),
      limit: Number(limit),
      hasMore: skip + bids.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/bids/:id — update a bid (before acceptance) ─
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id as string },
      include: { job: true },
    });

    if (!bid) {
      res.status(404).json({ success: false, message: 'Bid not found' });
      return;
    }
    if (bid.providerId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'You can only update your own bid' });
      return;
    }
    if (bid.isSelected) {
      res.status(400).json({ success: false, message: 'Cannot update an accepted bid' });
      return;
    }

    const { amount, message, estimatedDuration } = req.body;
    const updated = await prisma.bid.update({
      where: { id: req.params.id as string },
      data: {
        ...(amount && { amount: Number(amount) }),
        ...(message && { message }),
        ...(estimatedDuration && { estimatedDuration }),
      },
      include: {
        provider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
      },
    });

    // Broadcast updated bid
    try {
      getIO().to(`bidding:${bid.jobId}`).emit('bid:updated', updated);
    } catch (e) {}

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /api/bids/:id — withdraw a bid ────────────────
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id as string },
    });

    if (!bid) {
      res.status(404).json({ success: false, message: 'Bid not found' });
      return;
    }
    if (bid.providerId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'You can only withdraw your own bid' });
      return;
    }
    if (bid.isSelected) {
      res.status(400).json({ success: false, message: 'Cannot withdraw an accepted bid' });
      return;
    }

    await prisma.bid.delete({ where: { id: req.params.id as string } });

    // Broadcast bid withdrawal
    try {
      getIO().to(`bidding:${bid.jobId}`).emit('bid:withdrawn', { bidId: bid.id, jobId: bid.jobId });
    } catch (e) {}

    res.json({ success: true, data: { message: 'Bid withdrawn successfully' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/bids/:id/accept — accept a bid ────────────
router.post('/:id/accept', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id as string },
      include: { job: true, provider: true },
    });

    if (!bid) {
      res.status(404).json({ success: false, message: 'Bid not found' });
      return;
    }
    if (bid.job.customerId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Only the job owner can accept bids' });
      return;
    }

    // Update bid and job in a transaction
    await prisma.$transaction([
      prisma.bid.update({
        where: { id: bid.id },
        data: { isSelected: true },
      }),
      prisma.serviceRequest.update({
        where: { id: bid.jobId },
        data: {
          status: 'ACCEPTED',
          selectedBidId: bid.id,
          selectedProviderId: bid.providerId,
          revisedPrice: bid.amount,
        },
      }),
    ]);

    // ─── Real-time notification to provider (DB + Socket.IO) ───
    await createAndPushNotification({
      userId: bid.providerId,
      type: 'BID_ACCEPTED',
      title: 'Bid Accepted! 🎉',
      body: `Your bid of ₹${bid.amount} on "${bid.job.title}" was accepted`,
      data: { jobId: bid.jobId, bidId: bid.id },
    });

    // Broadcast to bidding room so other bidders know
    try {
      getIO().to(`bidding:${bid.jobId}`).emit('bid:accepted', {
        bidId: bid.id,
        jobId: bid.jobId,
        providerId: bid.providerId,
      });
      getIO().emit('job:statusChange', { jobId: bid.jobId, status: 'ACCEPTED' });
    } catch (e) {}

    res.json({ success: true, data: { message: 'Bid accepted successfully' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
