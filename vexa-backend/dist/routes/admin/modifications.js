import { Router } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';
import { logAdminAction } from '../../utils/admin/audit';
const router = Router();
router.use(adminAuthMiddleware);
const parsePage = (value, fallback) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0)
        return fallback;
    return Math.floor(parsed);
};
router.get('/modifications', async (req, res) => {
    try {
        const { status, jobId, providerId, search, page = '1', limit = '20' } = req.query;
        const currentPage = parsePage(page, 1);
        const currentLimit = Math.min(parsePage(limit, 20), 100);
        const skip = (currentPage - 1) * currentLimit;
        const where = {};
        if (status)
            where.approvalStatus = String(status);
        if (jobId)
            where.jobId = String(jobId);
        if (providerId)
            where.providerId = String(providerId);
        if (search && String(search).trim()) {
            const term = String(search).trim();
            where.OR = [
                { revisionReason: { contains: term, mode: 'insensitive' } },
                { job: { title: { contains: term, mode: 'insensitive' } } },
                { job: { orderId: { contains: term, mode: 'insensitive' } } },
                { provider: { name: { contains: term, mode: 'insensitive' } } },
            ];
        }
        const [items, total] = await Promise.all([
            prisma.jobModification.findMany({
                where,
                include: {
                    job: {
                        select: {
                            id: true,
                            orderId: true,
                            title: true,
                            status: true,
                            originalPrice: true,
                            revisedPrice: true,
                            customer: { select: { id: true, name: true, email: true } },
                        },
                    },
                    provider: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            accountStatus: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: currentLimit,
            }),
            prisma.jobModification.count({ where }),
        ]);
        const withRiskFlags = items.map((item) => {
            const originalPriceNum = Number(item.originalPrice);
            const revisedPriceNum = Number(item.revisedPrice);
            const priceJumpRatio = originalPriceNum > 0
                ? (revisedPriceNum - originalPriceNum) / originalPriceNum
                : 0;
            const riskFlags = [];
            if (priceJumpRatio >= 0.5) {
                riskFlags.push('PRICE_JUMP_GT_50_PERCENT');
            }
            if (item.revisionImages.length === 0) {
                riskFlags.push('NO_EVIDENCE_IMAGES');
            }
            return {
                ...item,
                analytics: {
                    priceJumpRatio,
                    priceDelta: revisedPriceNum - originalPriceNum,
                    riskFlags,
                },
            };
        });
        res.json({
            success: true,
            data: withRiskFlags,
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
router.get('/modifications/:id', async (req, res) => {
    try {
        const item = await prisma.jobModification.findUnique({
            where: { id: String(req.params.id) },
            include: {
                job: {
                    include: {
                        customer: { select: { id: true, name: true, email: true, phone: true } },
                        selectedProvider: { select: { id: true, name: true, email: true, phone: true } },
                        modifications: {
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                approvalStatus: true,
                                revisionReason: true,
                                originalPrice: true,
                                revisedPrice: true,
                                createdAt: true,
                            },
                        },
                    },
                },
                provider: { select: { id: true, name: true, email: true, phone: true, accountStatus: true } },
            },
        });
        if (!item) {
            res.status(404).json({ success: false, message: 'Modification not found' });
            return;
        }
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/modifications/:id/decision', async (req, res) => {
    try {
        const { approvalStatus, customerResponse } = req.body;
        if (!approvalStatus || !['APPROVED', 'REJECTED'].includes(approvalStatus)) {
            res.status(400).json({ success: false, message: 'approvalStatus must be APPROVED or REJECTED' });
            return;
        }
        const item = await prisma.jobModification.findUnique({
            where: { id: String(req.params.id) },
            include: { job: true },
        });
        if (!item) {
            res.status(404).json({ success: false, message: 'Modification not found' });
            return;
        }
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.jobModification.update({
                where: { id: item.id },
                data: {
                    approvalStatus,
                    customerResponse: customerResponse || `Decision by admin (${req.admin.adminRole})`,
                },
            });
            await tx.serviceRequest.update({
                where: { id: item.jobId },
                data: approvalStatus === 'APPROVED'
                    ? {
                        status: 'IN_PROGRESS',
                        revisedPrice: item.revisedPrice,
                    }
                    : {
                        status: 'IN_PROGRESS',
                    },
            });
            return updated;
        });
        await logAdminAction({
            entityType: 'JOB_MODIFICATION',
            entityId: item.id,
            action: `MODIFICATION_${approvalStatus}`,
            performedById: req.admin.userId,
            previousState: item,
            newState: result,
            req,
        });
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/modifications/scan', async (_req, res) => {
    try {
        const jobs = await prisma.serviceRequest.findMany({
            where: {
                OR: [
                    { status: 'MODIFICATION_REQUESTED' },
                    { modificationCount: { gt: 0 } },
                ],
            },
            include: {
                modifications: {
                    orderBy: { createdAt: 'desc' },
                    include: { provider: { select: { id: true } } },
                },
            },
            take: 300,
        });
        const flags = [];
        for (const job of jobs) {
            if (job.modificationCount > job.maxModifications) {
                flags.push({
                    jobId: job.id,
                    reason: 'Modification count exceeded configured maximum',
                    severity: 'HIGH',
                });
            }
            const latest = job.modifications[0];
            if (latest) {
                const latestOriginalPrice = Number(latest.originalPrice);
                const latestRevisedPrice = Number(latest.revisedPrice);
                if (latestOriginalPrice > 0) {
                    const jumpRatio = (latestRevisedPrice - latestOriginalPrice) / latestOriginalPrice;
                    if (jumpRatio >= 0.75) {
                        flags.push({
                            jobId: job.id,
                            reason: 'Latest modification has 75%+ price jump',
                            severity: 'HIGH',
                        });
                    }
                    else if (jumpRatio >= 0.4) {
                        flags.push({
                            jobId: job.id,
                            reason: 'Latest modification has 40%+ price jump',
                            severity: 'MEDIUM',
                        });
                    }
                }
            }
        }
        res.json({ success: true, data: { scannedJobs: jobs.length, flags } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
export default router;
//# sourceMappingURL=modifications.js.map