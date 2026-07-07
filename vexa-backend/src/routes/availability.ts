import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ─── GET /api/availability/my — get my availability slots ──
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const slots = await prisma.providerAvailability.findMany({
      where: { providerId: req.user!.userId },
      orderBy: { dayOfWeek: 'asc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        providerProfile: {
          select: { availabilityStatus: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        status: user?.providerProfile?.availabilityStatus || 'OFFLINE',
        slots,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/availability — set/update weekly availability ──
router.put('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'PROVIDER') {
      res.status(403).json({ success: false, message: 'Only providers can manage availability' });
      return;
    }

    const { slots } = req.body;

    if (!Array.isArray(slots)) {
      res.status(400).json({ success: false, message: 'slots array is required' });
      return;
    }

    // Validate slots
    const validated = slots
      .filter((s: any) => {
        const day = Number(s.dayOfWeek);
        return day >= 0 && day <= 6 && s.startTime && s.endTime;
      })
      .map((s: any) => ({
        dayOfWeek: Number(s.dayOfWeek),
        startTime: String(s.startTime).trim(),
        endTime: String(s.endTime).trim(),
        isBlocked: Boolean(s.isBlocked),
      }));

    // Replace all slots in a transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.providerAvailability.deleteMany({
        where: { providerId: req.user!.userId },
      });

      if (validated.length > 0) {
        await tx.providerAvailability.createMany({
          data: validated.map((s) => ({
            providerId: req.user!.userId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isBlocked: s.isBlocked,
          })),
        });
      }

      return tx.providerAvailability.findMany({
        where: { providerId: req.user!.userId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/availability/status — toggle online/offline ──
router.patch('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'PROVIDER') {
      res.status(403).json({ success: false, message: 'Only providers can toggle availability' });
      return;
    }

    const { status } = req.body;

    if (!['ONLINE', 'OFFLINE', 'BUSY'].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be ONLINE, OFFLINE, or BUSY' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        providerProfile: {
          update: { availabilityStatus: status as any },
        },
      },
      select: {
        id: true,
        providerProfile: {
          select: { availabilityStatus: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        availabilityStatus: user.providerProfile?.availabilityStatus || 'OFFLINE',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/availability/block — block a specific date ──
router.post('/block', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'PROVIDER') {
      res.status(403).json({ success: false, message: 'Only providers can manage availability' });
      return;
    }

    const { dayOfWeek } = req.body;
    const day = Number(dayOfWeek);

    if (day < 0 || day > 6) {
      res.status(400).json({ success: false, message: 'dayOfWeek must be 0-6 (Sunday-Saturday)' });
      return;
    }

    const slot = await prisma.providerAvailability.upsert({
      where: {
        providerId_dayOfWeek: {
          providerId: req.user!.userId,
          dayOfWeek: day,
        },
      },
      update: { isBlocked: true },
      create: {
        providerId: req.user!.userId,
        dayOfWeek: day,
        startTime: '00:00',
        endTime: '00:00',
        isBlocked: true,
      },
    });

    res.json({ success: true, data: slot });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/availability/provider/:providerId — check provider availability ──
router.get('/provider/:providerId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.user.findUnique({
      where: { id: req.params.providerId as string },
      select: {
        providerProfile: {
          select: { availabilityStatus: true },
        },
      },
    });

    const slots = await prisma.providerAvailability.findMany({
      where: { providerId: req.params.providerId as string },
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json({
      success: true,
      data: {
        status: provider?.providerProfile?.availabilityStatus || 'OFFLINE',
        slots,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
