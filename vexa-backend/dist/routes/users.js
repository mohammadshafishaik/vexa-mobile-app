import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
const router = Router();
// ─── POST /api/users/device-token ─────────────────────────
// Register or update device token for push notifications
router.post('/device-token', authMiddleware, async (req, res) => {
    try {
        const { deviceToken } = req.body;
        if (!deviceToken) {
            res.status(400).json({ success: false, message: 'deviceToken is required' });
            return;
        }
        await prisma.pushToken.upsert({
            where: { token: deviceToken },
            update: { userId: req.user.userId, isActive: true },
            create: { token: deviceToken, userId: req.user.userId, isActive: true, platform: 'ANDROID' },
        });
        res.json({ success: true, message: 'Device token registered' });
    }
    catch (error) {
        console.error('Device token registration error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── DELETE /api/users/device-token ───────────────────────
// Remove device token (e.g., on logout)
router.delete('/device-token', authMiddleware, async (req, res) => {
    try {
        const { deviceToken } = req.body;
        if (!deviceToken) {
            res.status(400).json({ success: false, message: 'deviceToken is required' });
            return;
        }
        await prisma.pushToken.updateMany({
            where: { token: deviceToken, userId: req.user.userId },
            data: { isActive: false },
        });
        res.json({ success: true, message: 'Device token removed' });
    }
    catch (error) {
        console.error('Device token removal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── POST /api/users/kyc ───────────────────────────────────
// Submit KYC documents for verification
router.post('/kyc', authMiddleware, async (req, res) => {
    try {
        const { kycDocuments } = req.body;
        if (!kycDocuments || !Array.isArray(kycDocuments) || kycDocuments.length === 0) {
            res.status(400).json({ success: false, message: 'kycDocuments array is required' });
            return;
        }
        const normalizedDocs = kycDocuments
            .map((doc) => String(doc || '').trim())
            .filter((doc) => !!doc);
        if (normalizedDocs.length === 0) {
            res.status(400).json({ success: false, message: 'kycDocuments must contain valid document URLs' });
            return;
        }
        const parsedDocuments = normalizedDocs.map((doc) => {
            const [rawType, rawValue] = doc.includes('|') ? doc.split('|', 2) : ['OTHER', doc];
            const normalizedType = String(rawType || 'OTHER').trim().toUpperCase();
            const documentType = ['AADHAAR', 'PAN', 'OTHER'].includes(normalizedType) ? normalizedType : 'OTHER';
            const fileUrl = String(rawValue || '').trim();
            const fileKey = fileUrl.split('/').filter(Boolean).pop() || `${documentType.toLowerCase()}-${Date.now()}`;
            return {
                documentType: documentType,
                fileUrl,
                fileKey,
            };
        }).filter((doc) => !!doc.fileUrl);
        if (parsedDocuments.length === 0) {
            res.status(400).json({ success: false, message: 'No valid KYC document entries found' });
            return;
        }
        const existingUser = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                isVerified: true,
                kycStatus: true,
            },
        });
        if (!existingUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const normalizedStatus = String(existingUser.kycStatus || '').toUpperCase();
        if (normalizedStatus === 'APPROVED' || normalizedStatus === 'VERIFIED') {
            res.status(400).json({
                success: false,
                message: 'Your profile is already verified. Reverification is not required.',
            });
            return;
        }
        const user = await prisma.$transaction(async (tx) => {
            await tx.kYCVerification.deleteMany({
                where: {
                    userId: req.user.userId,
                    documentType: {
                        in: parsedDocuments.map((doc) => doc.documentType),
                    },
                },
            });
            await tx.kYCVerification.createMany({
                data: parsedDocuments.map((doc) => ({
                    userId: req.user.userId,
                    documentType: doc.documentType,
                    fileUrl: doc.fileUrl,
                    fileKey: doc.fileKey,
                    status: 'PENDING',
                })),
            });
            return tx.user.update({
                where: { id: req.user.userId },
                data: {
                    kycStatus: 'PENDING',
                    isVerified: false,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isVerified: true,
                    kycStatus: true,
                },
            });
        });
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error('KYC submission error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── GET /api/users/profile/:userId ───────────────────────
// Get public profile of a user (for viewing provider profiles)
router.get('/profile/:userId', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: String(req.params.userId) },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                phone: true,
                role: true,
                isVerified: true,
                kycStatus: true,
                createdAt: true,
                providerProfile: {
                    select: {
                        bio: true,
                        availabilityStatus: true,
                    },
                },
                // Include ratings received
                ratingsReceived: {
                    select: {
                        overallScore: true,
                        createdAt: true,
                        rater: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                // Include reviews received
                reviewsReceived: {
                    select: {
                        text: true,
                        createdAt: true,
                        author: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                // Include completed jobs count
                selectedForJobs: {
                    where: { status: 'PAID' },
                    select: { id: true },
                },
                // Include skills
                skills: {
                    select: {
                        id: true,
                        categoryName: true,
                        experienceYears: true,
                        isVerified: true,
                    },
                    orderBy: { categoryName: 'asc' },
                },
                // Include portfolio
                portfolioItems: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        mediaUrl: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
                // Include payments received for total earnings
                paymentsReceived: {
                    where: { status: 'COMPLETED' },
                    select: { providerPayout: true },
                },
            },
        });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        // Calculate average rating
        const avgRating = user.ratingsReceived.length > 0
            ? user.ratingsReceived.reduce((sum, r) => sum + r.overallScore, 0) / user.ratingsReceived.length
            : 0;
        // Calculate total earnings
        const totalEarnings = user.paymentsReceived.reduce((sum, p) => sum + Number(p.providerPayout || 0), 0);
        const profile = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            phone: user.phone,
            role: user.role,
            bio: user.providerProfile?.bio || null,
            availabilityStatus: user.providerProfile?.availabilityStatus || 'OFFLINE',
            isVerified: user.isVerified,
            kycStatus: user.kycStatus,
            createdAt: user.createdAt,
            ratingsReceived: user.ratingsReceived.map((r, index) => {
                const reviewText = user.reviewsReceived[index]?.text || '';
                return {
                    id: String(index),
                    score: r.overallScore,
                    review: reviewText,
                    createdAt: r.createdAt,
                    rater: r.rater,
                };
            }),
            skills: user.skills.map((s) => ({
                id: s.id,
                category: s.categoryName,
                experienceYears: s.experienceYears,
                isVerified: s.isVerified,
            })),
            portfolioItems: user.portfolioItems.map((p) => ({
                id: p.id,
                title: p.title,
                description: p.description,
                imageUrl: p.mediaUrl,
                createdAt: p.createdAt,
            })),
            completedJobsCount: user.selectedForJobs.length,
            averageRating: Math.round(avgRating * 10) / 10,
            totalRatings: user.ratingsReceived.length,
            totalEarnings: Math.round(totalEarnings * 100) / 100,
            portfolioCount: user.portfolioItems.length,
        };
        res.json({ success: true, data: profile });
    }
    catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── PATCH /api/users/profile ─────────────────────────────
// Update own profile
router.patch('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, phone, avatarUrl, bio } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (phone)
            updateData.phone = phone;
        if (avatarUrl)
            updateData.avatarUrl = avatarUrl;
        if (bio !== undefined) {
            updateData.providerProfile = {
                upsert: {
                    create: { bio },
                    update: { bio },
                },
            };
        }
        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                phone: true,
                role: true,
                isVerified: true,
                kycStatus: true,
                createdAt: true,
                updatedAt: true,
                providerProfile: {
                    select: {
                        bio: true,
                        availabilityStatus: true,
                    },
                },
            },
        });
        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                phone: user.phone,
                role: user.role,
                bio: user.providerProfile?.bio || null,
                availabilityStatus: user.providerProfile?.availabilityStatus || 'OFFLINE',
                isVerified: user.isVerified,
                kycStatus: user.kycStatus,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
export default router;
//# sourceMappingURL=users.js.map