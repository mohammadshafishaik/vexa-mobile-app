import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';

const router = Router();

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
    const { title, description, category, location, latitude, longitude, images, originalPrice } = req.body;

    if (!title || !description || !category || !location || !originalPrice) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const job = await prisma.serviceRequest.create({
      data: {
        customerId: req.user!.userId,
        title,
        description,
        category,
        location,
        latitude: latitude || null,
        longitude: longitude || null,
        images: images || [],
        originalPrice: Number(originalPrice),
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

export default router;
