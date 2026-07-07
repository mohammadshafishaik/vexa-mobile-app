import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';
import { sendJobPostedEmail } from '../lib/email';

const router = Router();

const CATEGORY_MIN_PRICE: Record<string, number> = {
  plumbing: 150,
  electrical: 150,
  cleaning: 100,
  painting: 200,
  carpentry: 150,
  'appliance repair': 150,
  'ac service': 200,
  'pest control': 200,
  other: 100,
};

const DEFAULT_MIN_PRICE = 100;

const getMinimumPriceForCategory = (category: string): number => {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_MIN_PRICE[key] ?? DEFAULT_MIN_PRICE;
};

const sanitizeJobDescription = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const markerIndex = raw.toLowerCase().indexOf('ai summary:');
  const withoutSummary = markerIndex >= 0 ? raw.slice(0, markerIndex) : raw;
  return withoutSummary.replace(/\s+/g, ' ').trim();
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

// GET /api/jobs — list jobs (role-aware, with filters)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const {
      status, category,
      page = '1', limit = '20',
      lat, lng, radiusKm,
      minPrice, maxPrice,
      sortBy,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (role === 'CUSTOMER') {
      where.customerId = userId;
    } else if (role === 'PROVIDER') {
      // Get provider's registered skills
      const providerSkills = await prisma.providerSkill.findMany({
        where: { providerId: userId },
        select: { categoryName: true },
      });
      const skillCategories = providerSkills.map((s) => s.categoryName);

      // Providers see POSTED/BIDDING jobs matching their skills, or jobs assigned to them
      if (skillCategories.length > 0) {
        const categoryFilters = skillCategories.map((skillCategory) => ({
          categorySlug: { equals: skillCategory, mode: 'insensitive' as const },
        }));

        where.OR = [
          {
            status: { in: ['POSTED', 'BIDDING'] },
            OR: categoryFilters,
          },
          { selectedProviderId: userId },
        ];
      } else {
        // No skills registered — show all open jobs (backward compatible)
        where.OR = [
          { status: { in: ['POSTED', 'BIDDING'] } },
          { selectedProviderId: userId },
        ];
      }
    }

    if (status) where.status = status;
    if (category) where.categorySlug = { equals: String(category), mode: 'insensitive' };

    // Price range filters
    if (minPrice || maxPrice) {
      where.originalPrice = {};
      if (minPrice) where.originalPrice.gte = Number(minPrice);
      if (maxPrice) where.originalPrice.lte = Number(maxPrice);
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'price_asc') orderBy = { originalPrice: 'asc' };
    else if (sortBy === 'price_desc') orderBy = { originalPrice: 'desc' };

    const [jobs, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
          selectedProvider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } },
          bids: { include: { provider: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true, email: true, isVerified: true, createdAt: true, updatedAt: true } } } },
          modifications: true,
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    // Apply distance filtering if coordinates provided
    type JobWithComputedDistance = (typeof jobs)[number] & { distanceKm?: number | null };
    let filteredJobs: JobWithComputedDistance[] = jobs;
    if (lat && lng) {
      const userLat = Number(lat);
      const userLng = Number(lng);
      const maxRadius = Number(radiusKm) || 10;

      filteredJobs = jobs
        .map((job): JobWithComputedDistance => {
          if (job.latitude && job.longitude) {
            const R = 6371; // Earth radius in km
            const dLat = (job.latitude - userLat) * (Math.PI / 180);
            const dLon = (job.longitude - userLng) * (Math.PI / 180);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(userLat * (Math.PI / 180)) *
                Math.cos(job.latitude * (Math.PI / 180)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = Math.round(R * c * 10) / 10;
            return { ...job, distanceKm: distance };
          }
          return { ...job, distanceKm: null };
        })
        .filter((job) => job.distanceKm == null || job.distanceKm <= maxRadius);

      // Sort by distance if requested
      if (sortBy === 'distance') {
        filteredJobs.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      }
    }

    const sanitizedJobs = filteredJobs.map((job) => ({
      ...job,
      description: sanitizeJobDescription(job.description),
      category: job.categorySlug, // Map categorySlug to category for client compatibility
    }));

    res.json({
      success: true,
      data: sanitizedJobs,
      total: lat && lng ? filteredJobs.length : total,
      page: Number(page),
      limit: Number(limit),
      hasMore: lat && lng ? false : skip + jobs.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/jobs — create a service request
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, category, location, latitude, longitude, images, originalPrice, urgency } = req.body;
    const cleanedDescription = sanitizeJobDescription(description);

    if (!title || !cleanedDescription || !category || !location) {
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
        description: cleanedDescription,
        categorySlug: category,
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

    const jobFormatted = {
      ...job,
      category: job.categorySlug,
    };

    // Broadcast new job to all connected clients
    try { getIO().emit('job:new', jobFormatted); } catch (e) {}

    // Send job posted email to customer
    if (job.customer?.email) {
      sendJobPostedEmail(job.customer.email, {
        name: job.customer.name,
        jobTitle: job.title,
        orderId: job.orderId,
        category: job.categorySlug || 'General',
        location: job.location,
      }).catch(err => console.error('Failed to send job posted email:', err));
    }

    res.status(201).json({ success: true, data: jobFormatted });
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

    res.json({
      success: true,
      data: {
        ...job,
        description: sanitizeJobDescription(job.description),
        category: job.categorySlug,
      },
    });
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

    const jobFormatted = {
      ...job,
      category: job.categorySlug,
    };

    // Broadcast status change
    try { getIO().emit('job:statusChange', { jobId: req.params.id, status, job: jobFormatted }); } catch (e) {}

    res.json({ success: true, data: jobFormatted });
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

    const updatedFormatted = {
      ...updated,
      category: updated.categorySlug,
    };

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

    try { getIO().emit('job:statusChange', { jobId, status: 'COMPLETED', job: updatedFormatted }); } catch (e) {}

    res.json({ success: true, data: updatedFormatted });
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

    const updatedFormatted = {
      ...updated,
      category: updated.categorySlug,
    };

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

    try { getIO().emit('job:statusChange', { jobId, status: 'PAYMENT_PENDING', job: updatedFormatted }); } catch (e) {}

    res.json({ success: true, data: updatedFormatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
