import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { requireAdminRole } from '../../middleware/admin/requireAdminRole';
import { logAdminAction } from '../../utils/admin/audit';

const router = Router();

router.use(adminAuthMiddleware);

const parsePage = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const applyUserStatusChange = async ({
  userId,
  accountStatus,
  performedById,
  reason,
  suspendedUntil,
  req,
}: {
  userId: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
  performedById: string;
  reason?: string;
  suspendedUntil?: string;
  req: Request;
}) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return null;
  }

  const updateData: any = { accountStatus };

  if (accountStatus === 'SUSPENDED') {
    updateData.suspendedUntil = suspendedUntil ? new Date(suspendedUntil) : null;
    updateData.banReason = reason || user.banReason;
  }

  if (accountStatus === 'BANNED') {
    updateData.bannedAt = new Date();
    updateData.bannedById = performedById;
    updateData.banReason = reason || 'Banned by admin';
  }

  if (accountStatus === 'ACTIVE') {
    updateData.suspendedUntil = null;
    updateData.bannedAt = null;
    updateData.bannedById = null;
    updateData.banReason = null;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountStatus: true,
      suspendedUntil: true,
      bannedAt: true,
      bannedById: true,
      banReason: true,
      updatedAt: true,
    },
  });

  await logAdminAction({
    entityType: 'USER',
    entityId: user.id,
    action: `USER_STATUS_${accountStatus}`,
    performedById,
    previousState: {
      accountStatus: user.accountStatus,
      suspendedUntil: user.suspendedUntil,
      bannedAt: user.bannedAt,
      bannedById: user.bannedById,
      banReason: user.banReason,
    },
    newState: updated,
    req,
  });

  return updated;
};

router.get('/users', async (req: Request, res: Response) => {
  try {
    const { search, role, accountStatus, page = '1', limit = '20' } = req.query;
    const currentPage = parsePage(page, 1);
    const currentLimit = Math.min(parsePage(limit, 20), 100);
    const skip = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (role && String(role).trim()) {
      where.role = String(role).trim();
    }

    if (accountStatus && String(accountStatus).trim()) {
      where.accountStatus = String(accountStatus).trim();
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          adminRole: true,
          accountStatus: true,
          isVerified: true,
          kycStatus: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              serviceRequests: true,
              selectedForJobs: true,
              disputesRaised: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: currentLimit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      total,
      page: currentPage,
      limit: currentLimit,
      hasMore: skip + items.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      include: {
        kycDocumentsUploaded: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        serviceRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderId: true,
            title: true,
            category: true,
            status: true,
            originalPrice: true,
            revisedPrice: true,
            createdAt: true,
          },
        },
        selectedForJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderId: true,
            title: true,
            category: true,
            status: true,
            originalPrice: true,
            revisedPrice: true,
            createdAt: true,
          },
        },
        paymentsMade: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            job: { select: { id: true, orderId: true, title: true } },
          },
        },
        paymentsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            job: { select: { id: true, orderId: true, title: true } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const { accountStatus, suspendedUntil, reason } = req.body as {
      accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
      suspendedUntil?: string;
      reason?: string;
    };

    if (!accountStatus || !['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'].includes(accountStatus)) {
      res.status(400).json({ success: false, message: 'Valid accountStatus is required' });
      return;
    }

    const updated = await applyUserStatusChange({
      userId: String(req.params.id),
      accountStatus,
      reason,
      suspendedUntil,
      performedById: req.admin!.userId,
      req,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    const updated = await applyUserStatusChange({
      userId: String(req.params.id),
      accountStatus: 'BANNED',
      reason: req.body?.reason || 'Banned by admin',
      performedById: req.admin!.userId,
      req,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id/unban', async (req: Request, res: Response) => {
  try {
    const updated = await applyUserStatusChange({
      userId: String(req.params.id),
      accountStatus: 'ACTIVE',
      performedById: req.admin!.userId,
      req,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id/suspend', async (req: Request, res: Response) => {
  try {
    const updated = await applyUserStatusChange({
      userId: String(req.params.id),
      accountStatus: 'SUSPENDED',
      reason: req.body?.reason || 'Suspended by admin',
      suspendedUntil: req.body?.suspendedUntil,
      performedById: req.admin!.userId,
      req,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id/unsuspend', async (req: Request, res: Response) => {
  try {
    const updated = await applyUserStatusChange({
      userId: String(req.params.id),
      accountStatus: 'ACTIVE',
      performedById: req.admin!.userId,
      req,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', requireAdminRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: {
        accountStatus: 'DELETED',
      },
      select: {
        id: true,
        email: true,
        accountStatus: true,
      },
    });

    await logAdminAction({
      entityType: 'USER',
      entityId: user.id,
      action: 'USER_SOFT_DELETE',
      performedById: req.admin!.userId,
      previousState: { accountStatus: user.accountStatus },
      newState: updated,
      req,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admins', requireAdminRole(['SUPER_ADMIN']), async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        adminRole: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: admins });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admins', requireAdminRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { name, email, password, adminRole } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      adminRole?: 'SUPER_ADMIN' | 'MODERATOR';
    };

    if (!name || !email || !password || !adminRole) {
      res.status(400).json({ success: false, message: 'name, email, password and adminRole are required' });
      return;
    }

    if (!['SUPER_ADMIN', 'MODERATOR'].includes(adminRole)) {
      res.status(400).json({ success: false, message: 'Invalid adminRole value' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Admin email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const adminUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'ADMIN',
        adminRole,
        accountStatus: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        accountStatus: true,
        createdAt: true,
      },
    });

    await logAdminAction({
      entityType: 'ADMIN_USER',
      entityId: adminUser.id,
      action: 'ADMIN_USER_CREATED',
      performedById: req.admin!.userId,
      newState: adminUser,
      req,
    });

    res.status(201).json({ success: true, data: adminUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/admins/:id/role', requireAdminRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { adminRole } = req.body as { adminRole?: 'SUPER_ADMIN' | 'MODERATOR' };

    if (!adminRole || !['SUPER_ADMIN', 'MODERATOR'].includes(adminRole)) {
      res.status(400).json({ success: false, message: 'Valid adminRole is required' });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        role: true,
        adminRole: true,
      },
    });

    if (!existing || existing.role !== 'ADMIN') {
      res.status(404).json({ success: false, message: 'Admin user not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { adminRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        accountStatus: true,
      },
    });

    await logAdminAction({
      entityType: 'ADMIN_USER',
      entityId: existing.id,
      action: 'ADMIN_ROLE_UPDATED',
      performedById: req.admin!.userId,
      previousState: existing,
      newState: updated,
      req,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
