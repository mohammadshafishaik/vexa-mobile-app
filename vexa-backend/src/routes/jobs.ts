import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';

const router = Router();

const CATEGORY_MIN_PRICE: Record<string, number> = {
  plumbing: 300,
  electrical: 300,
  cleaning: 250,
  painting: 400,
  carpentry: 350,
  'appliance repair': 350,
  'ac service': 400,
  'pest control': 450,
  other: 250,
};

const DEFAULT_MIN_PRICE = 250;

const getMinimumPriceForCategory = (category: string): number => {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_MIN_PRICE[key] ?? DEFAULT_MIN_PRICE;
};

const generateOrderIdCandidate = (): string => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSegment = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VXA-${year}${month}${day}-${randomSegment}`;
};

const createUniqueOrderId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateOrderIdCandidate();
    const exists = await prisma.serviceRequest.findUnique({
      where: { orderId: candidate },
      select: { id: true },
    });

    if (!exists) {
      return candidate;
    }
  }

  const fallback = `VXA-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return fallback;
};

// GET /api/jobs — list jobs (role-aware)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const { status, category, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (role === 'CUSTOMER') {
      where.customerId = userId;
    } else if (role === 'PROVIDER') {
      // Providers see POSTED/BIDDING jobs or jobs assigned to them
      where.OR = [
        { status: { in: ['POSTED', 'BIDDING'] } },
        { selectedProviderId: userId },
      ];
    }

    if (status) where.status = status;
    if (category) where.category = category;

    const [jobs, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
          selectedProvider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
          bids: { include: { provider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } } } },
          modifications: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: jobs,
      total,
      page: Number(page),
      limit: Number(limit),
      hasMore: skip + jobs.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/jobs — create a service request
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, category, location, latitude, longitude, images, originalPrice, urgency } = req.body;

    if (!title || !description || !category || !location) {
      res.status(400).json({ success: false, message: 'Missing required fields (title, description, category, location)' });
      return;
    }

    const numericOriginalPrice = Number(originalPrice);
    const minPrice = getMinimumPriceForCategory(category);
    if (Number.isNaN(numericOriginalPrice) || numericOriginalPrice < minPrice) {
      res.status(400).json({
        success: false,
        message: `Minimum budget for ${category} is ₹${minPrice}`,
      });
      return;
    }

    const orderId = await createUniqueOrderId();

    const job = await prisma.serviceRequest.create({
      data: {
        orderId,
        customerId: req.user!.userId,
        title,
        description,
        category,
        location,
        latitude: latitude || null,
        longitude: longitude || null,
        images: images || [],
        originalPrice: numericOriginalPrice,
        urgency: urgency || 'NORMAL',
        status: 'BIDDING',
      },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
      },
    });

    // Broadcast new job to all connected clients
    try { getIO().emit('job:new', job); } catch (e) {}

    res.status(201).json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const job = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id as string },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
        selectedProvider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
        bids: {
          include: { provider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } } },
          orderBy: { amount: 'asc' },
        },
        modifications: { orderBy: { createdAt: 'desc' } },
        payments: true,
        ratings: true,
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/jobs/:id/status
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required' });
      return;
    }

    const job = await prisma.serviceRequest.update({
      where: { id: req.params.id as string },
      data: { status },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
        selectedProvider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
      },
    });

    // Broadcast status change
    try { getIO().emit('job:statusChange', { jobId: req.params.id, status, job }); } catch (e) {}

    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// ─── PATCH /api/jobs/:id/complete ──────────────────
// Provider marks job as completed and uploads completion photos
router.patch('/:id/complete', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { completedImages } = req.body;
    const jobId = req.params.id as string;

    const job = await prisma.serviceRequest.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    if (job.selectedProviderId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Only the assigned provider can mark this job as complete' });
      return;
    }
    if (!['ACCEPTED', 'IN_PROGRESS', 'ON_SITE_INSPECTION'].includes(job.status)) {
      res.status(400).json({ success: false, message: `Cannot complete job with status "${job.status}"` });
      return;
    }

    const updated = await prisma.serviceRequest.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedImages: completedImages || [],
      },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
        selectedProvider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
      },
    });

    // Notify customer
    try {
      const { createAndPushNotification } = await import('../utils/notificationHelper');
      await createAndPushNotification({
        userId: job.customerId,
        type: 'JOB_UPDATE',
        title: 'Work Completed! ✅',
        body: `Provider has finished work on "${job.title}". Please review and accept.`,
        data: { jobId },
      });
    } catch (e) {}

    try { getIO().emit('job:statusChange', { jobId, status: 'COMPLETED', job: updated }); } catch (e) {}

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/jobs/:id/accept-work ──────────────────
// Customer reviews completion and accepts the work → status becomes PAYMENT_PENDING
router.patch('/:id/accept-work', authMiddleware, async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id as string;

    const job = await prisma.serviceRequest.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    if (job.customerId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Only the customer can accept work' });
      return;
    }
    if (job.status !== 'COMPLETED') {
      res.status(400).json({ success: false, message: `Cannot accept work for job with status "${job.status}"` });
      return;
    }

    const updated = await prisma.serviceRequest.update({
      where: { id: jobId },
      data: { status: 'PAYMENT_PENDING' },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
        selectedProvider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
      },
    });

    // Notify provider
    if (job.selectedProviderId) {
      try {
        const { createAndPushNotification } = await import('../utils/notificationHelper');
        await createAndPushNotification({
          userId: job.selectedProviderId,
          type: 'JOB_UPDATE',
          title: 'Work Accepted! 🎉',
          body: `Customer accepted your work on "${job.title}". Payment is pending.`,
          data: { jobId },
        });
      } catch (e) {}
    }

    try { getIO().emit('job:statusChange', { jobId, status: 'PAYMENT_PENDING', job: updated }); } catch (e) {}

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

