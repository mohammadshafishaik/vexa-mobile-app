import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { createAndPushNotification } from '../utils/notificationHelper';

const router = Router();

// ─── POST /api/ratings — submit a rating ──────────────────
// ONLY allowed when job status is COMPLETED or PAID
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId, rateeId, score, review } = req.body;

    if (!jobId || !rateeId || score === undefined || !review) {
      res.status(400).json({ success: false, message: 'Missing required fields (jobId, rateeId, score, review)' });
      return;
    }

    if (typeof score !== 'number' || score < 1 || score > 5) {
      res.status(400).json({ success: false, message: 'Score must be an integer between 1 and 5' });
      return;
    }

    // ─── CRITICAL: Verify job status ───
    const job = await prisma.serviceRequest.findUnique({
      where: { id: jobId },
      include: { customer: true, selectedProvider: true },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    if (job.status !== 'COMPLETED' && job.status !== 'PAID') {
      res.status(403).json({
        success: false,
        message: `Cannot rate: job is currently "${job.status}". Ratings are only allowed after COMPLETED or PAID status.`,
      });
      return;
    }

    // Verify the rater is involved in this job
    const isCustomer = job.customerId === req.user!.userId;
    const isProvider = job.selectedProviderId === req.user!.userId;
    if (!isCustomer && !isProvider) {
      res.status(403).json({ success: false, message: 'Only the customer or assigned provider can rate' });
      return;
    }

    // Check if already rated
    const existing = await prisma.rating.findUnique({
      where: { jobId_raterId: { jobId, raterId: req.user!.userId } },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'You already rated this job' });
      return;
    }

    // Create the rating in the database
    const rating = await prisma.rating.create({
      data: {
        jobId,
        raterId: req.user!.userId,
        rateeId,
        score: Math.round(score),
        review,
      },
      include: {
        rater: { select: { id: true, name: true, avatarUrl: true } },
        ratee: { select: { id: true, name: true, avatarUrl: true } },
        job: { select: { id: true, title: true } },
      },
    });

    // ─── Real-time notification to the rated user ───
    await createAndPushNotification({
      userId: rateeId,
      type: 'RATING_RECEIVED',
      title: 'New Rating Received ⭐',
      body: `${rating.rater.name} gave you a ${score}-star rating for "${rating.job.title}"`,
      data: { jobId, ratingId: rating.id, score },
    });

    res.status(201).json({ success: true, data: rating });
  } catch (error: any) {
    console.error('[Ratings] create error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/ratings/user/:userId — get average rating & all reviews for a user ──
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const ratings = await prisma.rating.findMany({
      where: { rateeId: req.params.userId as string },
      include: {
        rater: { select: { id: true, name: true, avatarUrl: true } },
        job: { select: { id: true, title: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRatings = ratings.length;
    const averageScore = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings
      : 0;

    res.json({
      success: true,
      data: {
        ratings,
        totalRatings,
        averageScore: Math.round(averageScore * 10) / 10, // 1 decimal place
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/ratings/job/:jobId — get ratings for a specific job ──
router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const ratings = await prisma.rating.findMany({
      where: { jobId: req.params.jobId as string },
      include: {
        rater: { select: { id: true, name: true, avatarUrl: true } },
        ratee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.json({ success: true, data: ratings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
