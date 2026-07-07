import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { requireAdminRole } from '../../middleware/admin/requireAdminRole';
import { logAdminAction } from '../../utils/admin/audit';
import { createAndPushNotification } from '../../utils/notificationHelper';
const router = Router();
router.use(adminAuthMiddleware);
const parsePage = (value, fallback) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0)
        return fallback;
    return Math.floor(parsed);
};
const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const toPresenceStatus = (session) => {
    if (!session) {
        return 'OFFLINE';
    }
    const now = Date.now();
    const expiresAt = session.expiresAt.getTime();
    const lastTouchedAt = session.updatedAt.getTime();
    if (expiresAt <= now) {
        return 'OFFLINE';
    }
    return now - lastTouchedAt <= ONLINE_WINDOW_MS ? 'ONLINE' : 'OFFLINE';
};
const formatAdminDateTime = (value) => {
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(value);
};
const buildStatusNotificationPayload = ({ accountStatus, previousStatus, reason, suspendedUntil, }) => {
    const cleanReason = reason?.trim() || null;
    if (accountStatus === 'BANNED') {
        return {
            title: 'Account Banned',
            body: cleanReason
                ? `Your Vexa account has been banned. Reason: ${cleanReason}`
                : 'Your Vexa account has been banned by the admin team.',
        };
    }
    if (accountStatus === 'SUSPENDED') {
        const untilText = suspendedUntil
            ? ` until ${formatAdminDateTime(suspendedUntil)}`
            : '';
        const reasonText = cleanReason ? ` Reason: ${cleanReason}` : '';
        return {
            title: 'Account Suspended',
            body: `Your Vexa account has been suspended${untilText}.${reasonText}`.trim(),
        };
    }
    if (accountStatus === 'DELETED') {
        return {
            title: 'Account Deactivated',
            body: 'Your Vexa account has been deactivated. Contact support for assistance.',
        };
    }
    return {
        title: previousStatus === 'BANNED' ? 'Account Unbanned' : 'Account Reactivated',
        body: 'Your Vexa account is active again. You can continue using all app features.',
    };
};
const applyUserStatusChange = async ({ userId, accountStatus, performedById, reason, suspendedUntil, req, }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return null;
    }
    const updateData = { accountStatus: accountStatus };
    const previousStatus = user.accountStatus;
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
    try {
        const notificationPayload = buildStatusNotificationPayload({
            accountStatus: accountStatus,
            previousStatus: previousStatus,
            reason: accountStatus === 'ACTIVE' ? null : updated.banReason,
            suspendedUntil: updated.suspendedUntil,
        });
        await createAndPushNotification({
            userId: user.id,
            type: 'SYSTEM',
            title: notificationPayload.title,
            body: notificationPayload.body,
            data: {
                accountStatus: updated.accountStatus,
                previousStatus: previousStatus,
                suspendedUntil: updated.suspendedUntil ? updated.suspendedUntil.toISOString() : null,
                reason: updated.banReason || null,
            },
        });
    }
    catch (notificationError) {
        console.error('Failed to create account-status notification:', notificationError);
    }
    return updated;
};
router.get('/users', async (req, res) => {
    try {
        const { search, role, accountStatus, page = '1', limit = '20' } = req.query;
        const currentPage = parsePage(page, 1);
        const currentLimit = Math.min(parsePage(limit, 20), 100);
        const skip = (currentPage - 1) * currentLimit;
        const where = {};
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
                    accountStatus: true,
                    isVerified: true,
                    createdAt: true,
                    updatedAt: true,
                    adminProfile: {
                        select: {
                            adminRole: true,
                        },
                    },
                    sessions: {
                        select: {
                            updatedAt: true,
                            expiresAt: true,
                        },
                        orderBy: { updatedAt: 'desc' },
                        take: 1,
                    },
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
        const usersWithPresence = items.map((item) => {
            const latestSession = item.sessions[0] || null;
            const { sessions, adminProfile, ...rest } = item;
            return {
                ...rest,
                adminRole: adminProfile?.adminRole || null,
                presenceStatus: toPresenceStatus(latestSession),
            };
        });
        res.json({
            success: true,
            data: usersWithPresence,
            total,
            page: currentPage,
            limit: currentLimit,
            hasMore: skip + usersWithPresence.length < total,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/users/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: String(req.params.id) },
            include: {
                adminProfile: {
                    select: {
                        adminRole: true,
                    },
                },
                kycVerifications: {
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
                        categorySlug: true,
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
                        categorySlug: true,
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
                sessions: {
                    select: {
                        updatedAt: true,
                        expiresAt: true,
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const latestSession = user.sessions[0] || null;
        const { sessions, adminProfile, ...userWithoutSessions } = user;
        res.json({
            success: true,
            data: {
                ...userWithoutSessions,
                adminRole: adminProfile?.adminRole || null,
                presenceStatus: toPresenceStatus(latestSession),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/users/:id/status', async (req, res) => {
    try {
        const { accountStatus, suspendedUntil, reason } = req.body;
        if (!accountStatus || !['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'].includes(accountStatus)) {
            res.status(400).json({ success: false, message: 'Valid accountStatus is required' });
            return;
        }
        const updated = await applyUserStatusChange({
            userId: String(req.params.id),
            accountStatus,
            reason,
            suspendedUntil,
            performedById: req.admin.userId,
            req,
        });
        if (!updated) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/users/:id/ban', async (req, res) => {
    try {
        const updated = await applyUserStatusChange({
            userId: String(req.params.id),
            accountStatus: 'BANNED',
            reason: req.body?.reason || 'Banned by admin',
            performedById: req.admin.userId,
            req,
        });
        if (!updated) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/users/:id/unban', async (req, res) => {
    try {
        const updated = await applyUserStatusChange({
            userId: String(req.params.id),
            accountStatus: 'ACTIVE',
            performedById: req.admin.userId,
            req,
        });
        if (!updated) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/users/:id/suspend', async (req, res) => {
    try {
        const updated = await applyUserStatusChange({
            userId: String(req.params.id),
            accountStatus: 'SUSPENDED',
            reason: req.body?.reason || 'Suspended by admin',
            suspendedUntil: req.body?.suspendedUntil,
            performedById: req.admin.userId,
            req,
        });
        if (!updated) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/users/:id/unsuspend', async (req, res) => {
    try {
        const updated = await applyUserStatusChange({
            userId: String(req.params.id),
            accountStatus: 'ACTIVE',
            performedById: req.admin.userId,
            req,
        });
        if (!updated) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/users/:id', requireAdminRole(['SUPER_ADMIN']), async (req, res) => {
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
            performedById: req.admin.userId,
            previousState: { accountStatus: user.accountStatus },
            newState: updated,
            req,
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/admins', requireAdminRole(['SUPER_ADMIN']), async (_req, res) => {
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: {
                id: true,
                name: true,
                email: true,
                accountStatus: true,
                createdAt: true,
                updatedAt: true,
                adminProfile: {
                    select: {
                        adminRole: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        const formattedAdmins = admins.map((admin) => {
            const { adminProfile, ...rest } = admin;
            return {
                ...rest,
                adminRole: adminProfile?.adminRole || null,
            };
        });
        res.json({ success: true, data: formattedAdmins });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/admins', requireAdminRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { name, email, password, adminRole } = req.body;
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
                accountStatus: 'ACTIVE',
                adminProfile: {
                    create: {
                        adminRole: adminRole,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                accountStatus: true,
                createdAt: true,
                adminProfile: {
                    select: {
                        adminRole: true,
                    },
                },
            },
        });
        const formattedAdmin = {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
            adminRole: adminUser.adminProfile?.adminRole || null,
            accountStatus: adminUser.accountStatus,
            createdAt: adminUser.createdAt,
        };
        await logAdminAction({
            entityType: 'ADMIN_USER',
            entityId: adminUser.id,
            action: 'ADMIN_USER_CREATED',
            performedById: req.admin.userId,
            newState: formattedAdmin,
            req,
        });
        res.status(201).json({ success: true, data: formattedAdmin });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/admins/:id/role', requireAdminRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { adminRole } = req.body;
        if (!adminRole || !['SUPER_ADMIN', 'MODERATOR'].includes(adminRole)) {
            res.status(400).json({ success: false, message: 'Valid adminRole is required' });
            return;
        }
        const existing = await prisma.user.findUnique({
            where: { id: String(req.params.id) },
            select: {
                id: true,
                role: true,
                adminProfile: {
                    select: {
                        adminRole: true,
                    },
                },
            },
        });
        if (!existing || existing.role !== 'ADMIN') {
            res.status(404).json({ success: false, message: 'Admin user not found' });
            return;
        }
        const updated = await prisma.user.update({
            where: { id: String(req.params.id) },
            data: {
                adminProfile: {
                    update: {
                        adminRole: adminRole,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                accountStatus: true,
                adminProfile: {
                    select: {
                        adminRole: true,
                    },
                },
            },
        });
        const formattedUpdated = {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role,
            adminRole: updated.adminProfile?.adminRole || null,
            accountStatus: updated.accountStatus,
        };
        await logAdminAction({
            entityType: 'ADMIN_USER',
            entityId: existing.id,
            action: 'ADMIN_ROLE_UPDATED',
            performedById: req.admin.userId,
            previousState: {
                id: existing.id,
                role: existing.role,
                adminRole: existing.adminProfile?.adminRole || null,
            },
            newState: formattedUpdated,
            req,
        });
        res.json({ success: true, data: formattedUpdated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
export default router;
//# sourceMappingURL=users.js.map