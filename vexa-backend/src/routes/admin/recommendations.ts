import { Router, Request, Response } from 'express';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { logAdminAction } from '../../utils/admin/audit';
import {
  clearAiRecommendationConfigCache,
  getAiRecommendationConfig,
  getAiRecommendationConfigAuditIdentity,
  getAiRecommendationConfigWithMeta,
  mergeAiRecommendationConfig,
} from '../../utils/aiRecommendationConfig';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/recommendations/config', async (_req: Request, res: Response) => {
  try {
    const { config, updatedAt } = await getAiRecommendationConfigWithMeta();

    res.json({
      success: true,
      data: {
        config,
        updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/recommendations/config', async (req: Request, res: Response) => {
  try {
    const { config: incomingConfig, ...flatConfig } = (req.body || {}) as {
      config?: unknown;
      [key: string]: unknown;
    };

    const currentConfig = await getAiRecommendationConfig(true);
    const nextConfig = mergeAiRecommendationConfig(
      currentConfig,
      incomingConfig !== undefined ? incomingConfig : flatConfig,
    );

    const auditIdentity = getAiRecommendationConfigAuditIdentity();

    await logAdminAction({
      entityType: auditIdentity.entityType,
      entityId: auditIdentity.entityId,
      action: auditIdentity.action,
      performedById: req.admin!.userId,
      previousState: { config: currentConfig },
      newState: {
        config: nextConfig,
      },
      req,
    });

    clearAiRecommendationConfigCache();
    const refreshed = await getAiRecommendationConfigWithMeta(true);

    res.json({
      success: true,
      data: {
        config: refreshed.config,
        updatedAt: refreshed.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
