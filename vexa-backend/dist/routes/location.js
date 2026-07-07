import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';
const router = Router();
// ─── POST /api/location/update — provider updates location ─
router.post('/update', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'PROVIDER') {
            res.status(403).json({ success: false, message: 'Only providers can update location' });
            return;
        }
        const { latitude, longitude, jobId } = req.body;
        if (latitude == null || longitude == null) {
            res.status(400).json({ success: false, message: 'latitude and longitude are required' });
            return;
        }
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            res.status(400).json({ success: false, message: 'Invalid coordinates' });
            return;
        }
        // Update provider's last known location
        await prisma.user.update({
            where: { id: req.user.userId },
            data: {
                providerProfile: {
                    update: {
                        lastLocationLat: lat,
                        lastLocationLng: lng,
                        lastLocationUpdatedAt: new Date(),
                    },
                },
            },
        });
        // If a jobId is provided, also update the job's provider location
        if (jobId) {
            const job = await prisma.serviceRequest.findUnique({
                where: { id: jobId },
                select: { selectedProviderId: true, customerId: true, status: true },
            });
            if (job && job.selectedProviderId === req.user.userId) {
                await prisma.serviceRequest.update({
                    where: { id: jobId },
                    data: {
                        providerLat: lat,
                        providerLng: lng,
                        providerLocationUpdatedAt: new Date(),
                    },
                });
                // Broadcast to customer in real-time
                try {
                    getIO().to(`user:${job.customerId}`).emit('location:provider', {
                        jobId,
                        providerId: req.user.userId,
                        latitude: lat,
                        longitude: lng,
                        updatedAt: new Date().toISOString(),
                    });
                }
                catch (e) { }
            }
        }
        res.json({ success: true, data: { message: 'Location updated' } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── GET /api/location/job/:jobId — customer gets provider location ─
router.get('/job/:jobId', authMiddleware, async (req, res) => {
    try {
        const job = await prisma.serviceRequest.findUnique({
            where: { id: req.params.jobId },
            select: {
                customerId: true,
                selectedProviderId: true,
                providerLat: true,
                providerLng: true,
                providerLocationUpdatedAt: true,
                status: true,
                latitude: true,
                longitude: true,
                location: true,
            },
        });
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found' });
            return;
        }
        if (job.customerId !== req.user.userId) {
            res.status(403).json({ success: false, message: 'Only the customer can track provider location' });
            return;
        }
        // Only allow tracking when job is in active status
        const trackableStatuses = ['ACCEPTED', 'ON_SITE_INSPECTION', 'IN_PROGRESS'];
        if (!trackableStatuses.includes(job.status)) {
            res.status(400).json({
                success: false,
                message: 'Location tracking is only available when the provider is assigned and active',
            });
            return;
        }
        // Calculate rough ETA using Haversine distance
        let estimatedDistanceKm = null;
        if (job.providerLat && job.providerLng && job.latitude && job.longitude) {
            const R = 6371; // Earth radius in km
            const dLat = (job.latitude - job.providerLat) * (Math.PI / 180);
            const dLon = (job.longitude - job.providerLng) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(job.providerLat * (Math.PI / 180)) *
                    Math.cos(job.latitude * (Math.PI / 180)) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            estimatedDistanceKm = Math.round(R * c * 10) / 10;
        }
        res.json({
            success: true,
            data: {
                providerLat: job.providerLat,
                providerLng: job.providerLng,
                providerLocationUpdatedAt: job.providerLocationUpdatedAt,
                jobLat: job.latitude,
                jobLng: job.longitude,
                jobLocation: job.location,
                estimatedDistanceKm,
                estimatedEtaMins: estimatedDistanceKm
                    ? Math.round(estimatedDistanceKm * 3) // rough ~20km/h urban speed
                    : null,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
export default router;
//# sourceMappingURL=location.js.map