import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ─── POST /api/users/device-token ─────────────────────────
// Register or update device token for push notifications
router.post('/device-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { deviceToken } = req.body;

    if (!deviceToken) {
      res.status(400).json({ success: false, message: 'deviceToken is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { deviceTokens: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Add token if not already present
    const tokens = user.deviceTokens || [];
    if (!tokens.includes(deviceToken)) {
      tokens.push(deviceToken);
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { deviceTokens: tokens },
    });

    res.json({ success: true, message: 'Device token registered' });
  } catch (error: any) {
    console.error('Device token registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /api/users/device-token ───────────────────────
// Remove device token (e.g., on logout)
router.delete('/device-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { deviceToken } = req.body;

    if (!deviceToken) {
      res.status(400).json({ success: false, message: 'deviceToken is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { deviceTokens: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const tokens = (user.deviceTokens || []).filter((t) => t !== deviceToken);

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { deviceTokens: tokens },
    });

    res.json({ success: true, message: 'Device token removed' });
  } catch (error: any) {
    console.error('Device token removal error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/users/kyc ───────────────────────────────────
// Submit KYC documents for verification
router.post('/kyc', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { kycDocuments } = req.body;

    if (!kycDocuments || !Array.isArray(kycDocuments) || kycDocuments.length === 0) {
      res.status(400).json({ success: false, message: 'kycDocuments array is required' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        kycDocuments,
        kycStatus: 'PENDING',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        kycDocuments: true,
        kycStatus: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('KYC submission error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/users/profile/:userId ───────────────────────
// Get public profile of a user (for viewing provider profiles)
router.get('/profile/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phone: true,
        role: true,
        isVerified: true,
        kycStatus: true,
        createdAt: true,
        // Include ratings received
        ratingsReceived: {
          select: {
            score: true,
            review: true,
            createdAt: true,
            rater: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        // Include completed jobs count
        selectedForJobs: {
          where: { status: 'PAID' },
          select: { id: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Calculate average rating
    const avgRating =
      user.ratingsReceived.length > 0
        ? user.ratingsReceived.reduce((sum, r) => sum + r.score, 0) / user.ratingsReceived.length
        : 0;

    const profile = {
      ...user,
      completedJobsCount: user.selectedForJobs.length,
      averageRating: avgRating,
      totalRatings: user.ratingsReceived.length,
    };

    res.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/users/profile ─────────────────────────────
// Update own profile
router.patch('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, phone, avatarUrl } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phone: true,
        role: true,
        isVerified: true,
        kycStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
