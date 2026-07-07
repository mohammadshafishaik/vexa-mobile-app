import { Router } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { logAdminAction } from '../../utils/admin/audit';
import { sendMulticastNotification } from '../../lib/firebase';
const router = Router();
router.use(adminAuthMiddleware);
const parsePage = (value, fallback) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0)
        return fallback;
    return Math.floor(parsed);
};
router.get('/notifications/campaigns', async (req, res) => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const currentPage = parsePage(page, 1);
        const currentLimit = Math.min(parsePage(limit, 20), 100);
        const skip = (currentPage - 1) * currentLimit;
        const [items, total] = await Promise.all([
            prisma.notificationCampaign.findMany({
                include: {
                    sentBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            adminRole: true,
                        },
                    },
                },
                orderBy: { sentAt: 'desc' },
                skip,
                take: currentLimit,
            }),
            prisma.notificationCampaign.count(),
        ]);
        res.json({
            success: true,
            data: items,
            total,
            page: currentPage,
            limit: currentLimit,
            hasMore: skip + items.length < total,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/notifications/stats', async (_req, res) => {
    try {
        // Return empty stats since in-app notification table is deleted (FCM only)
        res.json({ success: true, data: { total: 0, unread: 0, last24h: 0 } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/notifications/campaigns', async (req, res) => {
    try {
        const { title, body, targetType, userIds, payload, } = req.body;
        if (!title || !body || !targetType) {
            res.status(400).json({ success: false, message: 'title, body and targetType are required' });
            return;
        }
        if (targetType === 'USER_IDS' && (!Array.isArray(userIds) || userIds.length === 0)) {
            res.status(400).json({ success: false, message: 'userIds are required when targetType is USER_IDS' });
            return;
        }
        const userWhere = { deletedAt: null };
        if (targetType === 'CUSTOMERS')
            userWhere.role = 'CUSTOMER';
        if (targetType === 'PROVIDERS')
            userWhere.role = 'PROVIDER';
        if (targetType === 'ADMINS')
            userWhere.role = 'ADMIN';
        if (targetType === 'USER_IDS')
            userWhere.id = { in: userIds };
        // Fetch active push tokens for target users
        const pushTokens = await prisma.pushToken.findMany({
            where: {
                isActive: true,
                user: userWhere,
            },
            select: {
                token: true,
                userId: true,
            },
        });
        if (pushTokens.length === 0) {
            res.status(400).json({ success: false, message: 'No active push tokens found for the selected target' });
            return;
        }
        const campaign = await prisma.notificationCampaign.create({
            data: {
                title,
                body,
                targetType,
                payload: payload || null,
                sentById: req.admin.userId,
                totalSent: pushTokens.length,
                totalFailed: 0,
            },
        });
        const targetUserIds = Array.from(new Set(pushTokens.map((pt) => pt.userId)));
        // Send multicast push notifications in batches
        const fcmData = {
            campaignId: campaign.id,
            ...(payload ? { payload: JSON.stringify(payload) } : {}),
        };
        const pushSuccess = await sendMulticastNotification(targetUserIds, title, body, 'SYSTEM', fcmData);
        const pushFailed = Math.max(pushTokens.length - pushSuccess, 0);
        const updatedCampaign = await prisma.notificationCampaign.update({
            where: { id: campaign.id },
            data: {
                totalSent: pushTokens.length,
                totalFailed: pushFailed,
                sentAt: new Date(),
                completedAt: new Date(),
            },
            include: {
                sentBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        adminRole: true,
                    },
                },
            },
        });
        await logAdminAction({
            entityType: 'NOTIFICATION_CAMPAIGN',
            entityId: campaign.id,
            action: 'NOTIFICATION_CAMPAIGN_SENT',
            performedById: req.admin.userId,
            newState: {
                targetType,
                tokenCount: pushTokens.length,
                userCount: targetUserIds.length,
                pushSuccess,
                pushFailed,
            },
            req,
        });
        res.status(201).json({
            success: true,
            data: {
                campaign: updatedCampaign,
                recipientCount: targetUserIds.length,
                sentCount: pushTokens.length,
                pushSuccess,
                pushFailed,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
export default router;
//# sourceMappingURL=notifications.js.map