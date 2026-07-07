import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
const router = Router();
// ─── GET /api/portfolio/:providerId — get provider portfolio ──
router.get('/:providerId', authMiddleware, async (req, res) => {
    try {
        const items = await prisma.portfolioItem.findMany({
            where: { providerId: req.params.providerId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: items });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── POST /api/portfolio — add a portfolio item ─────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'PROVIDER') {
            res.status(403).json({ success: false, message: 'Only providers can manage portfolio' });
            return;
        }
        const { title, description, imageUrl, category } = req.body;
        if (!title || !imageUrl) {
            res.status(400).json({ success: false, message: 'Title and imageUrl are required' });
            return;
        }
        const item = await prisma.portfolioItem.create({
            data: {
                providerId: req.user.userId,
                title: title.trim(),
                description: description?.trim() || null,
                imageUrl,
                category: category?.trim().toLowerCase() || null,
            },
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── DELETE /api/portfolio/:id — remove a portfolio item ──
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const item = await prisma.portfolioItem.findUnique({
            where: { id: req.params.id },
        });
        if (!item) {
            res.status(404).json({ success: false, message: 'Portfolio item not found' });
            return;
        }
        if (item.providerId !== req.user.userId) {
            res.status(403).json({ success: false, message: 'You can only delete your own portfolio items' });
            return;
        }
        await prisma.portfolioItem.delete({ where: { id: item.id } });
        res.json({ success: true, data: { message: 'Portfolio item removed' } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
export default router;
//# sourceMappingURL=portfolio.js.map