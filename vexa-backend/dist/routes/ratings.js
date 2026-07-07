import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { createAndPushNotification } from '../utils/notificationHelper';
import { getIO } from '../lib/socket';
const router = Router();
// ─── POST /api/ratings — submit a rating & review ──────────
// ONLY allowed when job status is COMPLETED or PAID
router.post('/', authMiddleware, async (req, res) => {
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
        const isCustomer = job.customerId === req.user.userId;
        const isProvider = job.selectedProviderId === req.user.userId;
        if (!isCustomer && !isProvider) {
            res.status(403).json({ success: false, message: 'Only the customer or assigned provider can rate' });
            return;
        }
        // Check if already rated
        const existing = await prisma.rating.findUnique({
            where: { jobId_raterId: { jobId, raterId: req.user.userId } },
        });
        if (existing) {
            res.status(409).json({ success: false, message: 'You already rated this job' });
            return;
        }
        // Create the rating & review in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const rating = await tx.rating.create({
                data: {
                    jobId,
                    raterId: req.user.userId,
                    rateeId,
                    overallScore: Math.round(score),
                },
                include: {
                    rater: { select: { id: true, name: true, avatarUrl: true } },
                    ratee: { select: { id: true, name: true, avatarUrl: true } },
                    job: { select: { id: true, title: true } },
                },
            });
            const reviewRecord = await tx.review.create({
                data: {
                    jobId,
                    authorId: req.user.userId,
                    subjectId: rateeId,
                    text: review,
                },
            });
            return { rating, review: reviewRecord };
        });
        // ─── Real-time notification to the rated user ───
        await createAndPushNotification({
            userId: rateeId,
            type: 'RATING_RECEIVED',
            title: 'New Rating Received ⭐',
            body: `${result.rating.rater.name} gave you a ${score}-star rating for "${result.rating.job.title}"`,
            data: { jobId, ratingId: result.rating.id, score: String(score) },
        });
        res.status(201).json({ success: true, data: { ...result.rating, review: result.review.text } });
        // Emit real-time rating event
        try {
            getIO().emit('rating:new', { jobId, rating: result.rating });
        }
        catch (e) { }
    }
    catch (error) {
        console.error('[Ratings] create error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── GET /api/ratings/user/:userId — get average rating & all reviews for a user ──
router.get('/user/:userId', async (req, res) => {
    try {
        const ratings = await prisma.rating.findMany({
            where: { rateeId: req.params.userId },
            include: {
                rater: { select: { id: true, name: true, avatarUrl: true } },
                job: { select: { id: true, title: true, categorySlug: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const totalRatings = ratings.length;
        const averageScore = totalRatings > 0
            ? ratings.reduce((sum, r) => sum + r.overallScore, 0) / totalRatings
            : 0;
        res.json({
            success: true,
            data: {
                ratings,
                totalRatings,
                averageScore: Math.round(averageScore * 10) / 10, // 1 decimal place
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── GET /api/ratings/job/:jobId — get ratings for a specific job ──
router.get('/job/:jobId', async (req, res) => {
    try {
        const ratings = await prisma.rating.findMany({
            where: { jobId: req.params.jobId },
            include: {
                rater: { select: { id: true, name: true, avatarUrl: true } },
                ratee: { select: { id: true, name: true, avatarUrl: true } },
            },
        });
        res.json({ success: true, data: ratings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
export default router;
//# sourceMappingURL=ratings.js.map