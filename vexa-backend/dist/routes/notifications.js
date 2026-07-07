import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
const router = Router();
// GET /api/notifications — Mocked empty list since in-app notification list is removed (FCM lock screen only)
router.get('/', authMiddleware, async (req, res) => {
    res.json({
        success: true,
        data: [],
        total: 0,
        unreadCount: 0,
        page: 1,
        limit: 20,
        hasMore: false,
    });
});
// PATCH /api/notifications/read — Mocked success
router.patch('/read', authMiddleware, async (req, res) => {
    res.json({ success: true, data: { message: 'Notifications marked as read' } });
});
export default router;
//# sourceMappingURL=notifications.js.map