import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { logAdminAction } from '../../utils/admin/audit';
import { sendMulticastNotification } from '../../lib/firebase';

const router = Router();

router.use(adminAuthMiddleware);

const parsePage = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

router.get('/notifications/campaigns', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/notifications/stats', async (_req: Request, res: Response) => {
  try {
    const [total, unread, last24h] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: false } }),
      prisma.notification.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({ success: true, data: { total, unread, last24h } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/notifications/campaigns', async (req: Request, res: Response) => {
  try {
    const {
      title,
      body,
      targetType,
      userIds,
      payload,
      sendPush = true,
    } = req.body as {
      title?: string;
      body?: string;
      targetType?: 'ALL' | 'CUSTOMERS' | 'PROVIDERS' | 'ADMINS' | 'USER_IDS';
      userIds?: string[];
      payload?: unknown;
      sendPush?: boolean;
    };

    if (!title || !body || !targetType) {
      res.status(400).json({ success: false, message: 'title, body and targetType are required' });
      return;
    }

    if (targetType === 'USER_IDS' && (!Array.isArray(userIds) || userIds.length === 0)) {
      res.status(400).json({ success: false, message: 'userIds are required when targetType is USER_IDS' });
      return;
    }

    const where: any = {};

    if (targetType === 'CUSTOMERS') where.role = 'CUSTOMER';
    if (targetType === 'PROVIDERS') where.role = 'PROVIDER';
    if (targetType === 'ADMINS') where.role = 'ADMIN';
    if (targetType === 'USER_IDS') where.id = { in: userIds };

    const recipients = await prisma.user.findMany({
      where,
      select: {
        id: true,
        deviceTokens: true,
      },
      take: 5000,
    });

    if (recipients.length === 0) {
      res.status(400).json({ success: false, message: 'No recipients found for selected target' });
      return;
    }

    const campaign = await prisma.notificationCampaign.create({
      data: {
        title,
        body,
        targetType,
        payload: (payload as any) || null,
        sentById: req.admin!.userId,
        totalSent: 0,
        totalFailed: 0,
      },
    });

    const notifications = recipients.map((recipient) => ({
      userId: recipient.id,
      type: 'SYSTEM' as const,
      title,
      body,
      data: {
        campaignId: campaign.id,
        payload: (payload as any) || null,
      } as any,
    }));

    const created = await prisma.notification.createMany({ data: notifications });

    let pushSuccess = 0;
    let pushFailed = 0;

    if (sendPush) {
      const allTokens = recipients.flatMap((recipient) => recipient.deviceTokens || []);
      const batches = chunk(allTokens, 400);

      for (const batch of batches) {
        const successCount = await sendMulticastNotification(batch, title, body, {
          campaignId: campaign.id,
        });

        pushSuccess += successCount;
        pushFailed += Math.max(batch.length - successCount, 0);
      }
    }

    const updatedCampaign = await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        totalSent: created.count,
        totalFailed: sendPush ? pushFailed : 0,
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
      performedById: req.admin!.userId,
      newState: {
        targetType,
        recipientCount: recipients.length,
        sentCount: created.count,
        pushSuccess,
        pushFailed,
      },
      req,
    });

    res.status(201).json({
      success: true,
      data: {
        campaign: updatedCampaign,
        recipientCount: recipients.length,
        sentCount: created.count,
        pushSuccess,
        pushFailed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
