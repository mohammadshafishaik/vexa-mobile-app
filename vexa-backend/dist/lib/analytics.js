// ═══════════════════════════════════════════════════════════════════════════════
// VEXA 2.0 — Analytics Event Service
// Buffered write analytics with pre-built aggregation queries
// ═══════════════════════════════════════════════════════════════════════════════
import prisma from './prisma';
// ─── Configuration ──────────────────────────────────────────────────────────
const FLUSH_INTERVAL_MS = parseInt(process.env.ANALYTICS_FLUSH_INTERVAL_MS || '5000', 10);
const BATCH_SIZE = parseInt(process.env.ANALYTICS_BATCH_SIZE || '100', 10);
// ─── Event Buffer ───────────────────────────────────────────────────────────
let eventBuffer = [];
let flushTimer = null;
let isFlushing = false;
/**
 * Track an analytics event. Events are buffered and flushed in batches.
 */
export function trackEvent(event) {
    eventBuffer.push({
        ...event,
        timestamp: new Date(),
    });
    // Flush immediately if buffer is full
    if (eventBuffer.length >= BATCH_SIZE) {
        flushEvents().catch(console.error);
    }
}
/**
 * Convenience method for tracking common events with type safety.
 */
export const track = {
    pageView(userId, page, meta) {
        trackEvent({ userId, eventType: 'PAGE_VIEW', metadata: { page, ...meta } });
    },
    jobCreated(userId, jobId, meta) {
        trackEvent({ userId, eventType: 'JOB_CREATED', entityType: 'service_request', entityId: jobId, metadata: meta });
    },
    jobViewed(userId, jobId) {
        trackEvent({ userId, eventType: 'JOB_VIEWED', entityType: 'service_request', entityId: jobId });
    },
    bidPlaced(userId, bidId, jobId, amount) {
        trackEvent({ userId, eventType: 'BID_PLACED', entityType: 'bid', entityId: bidId, metadata: { jobId, amount } });
    },
    bidAccepted(userId, bidId, jobId) {
        trackEvent({ userId, eventType: 'BID_ACCEPTED', entityType: 'bid', entityId: bidId, metadata: { jobId } });
    },
    paymentCompleted(userId, paymentId, amount) {
        trackEvent({ userId, eventType: 'PAYMENT_COMPLETED', entityType: 'payment', entityId: paymentId, metadata: { amount } });
    },
    paymentFailed(userId, paymentId, reason) {
        trackEvent({ userId, eventType: 'PAYMENT_FAILED', entityType: 'payment', entityId: paymentId, metadata: { reason } });
    },
    disputeOpened(userId, disputeId, jobId) {
        trackEvent({ userId, eventType: 'DISPUTE_OPENED', entityType: 'dispute', entityId: disputeId, metadata: { jobId } });
    },
    ratingSubmitted(userId, ratingId, score) {
        trackEvent({ userId, eventType: 'RATING_SUBMITTED', entityType: 'rating', entityId: ratingId, metadata: { score } });
    },
    chatMessageSent(userId, chatRoomId) {
        trackEvent({ userId, eventType: 'CHAT_MESSAGE_SENT', entityType: 'chat_room', entityId: chatRoomId });
    },
    login(userId, platform, ipAddress) {
        trackEvent({ userId, eventType: 'LOGIN', platform, ipAddress });
    },
    signup(userId, platform) {
        trackEvent({ userId, eventType: 'SIGNUP', platform });
    },
    error(userId, errorMessage, meta) {
        trackEvent({ userId, eventType: 'ERROR', metadata: { errorMessage, ...meta } });
    },
    voiceBookingStarted(userId, bookingId) {
        trackEvent({ userId, eventType: 'VOICE_BOOKING_STARTED', entityType: 'voice_booking', entityId: bookingId });
    },
    aiMatchRequested(userId, jobId, matchCount) {
        trackEvent({ userId, eventType: 'AI_MATCH_REQUESTED', entityType: 'service_request', entityId: jobId, metadata: { matchCount } });
    },
};
// ─── Flush Logic ────────────────────────────────────────────────────────────
/**
 * Flush buffered events to database. Uses createMany for batch insert.
 */
async function flushEvents() {
    if (isFlushing || eventBuffer.length === 0)
        return;
    isFlushing = true;
    const events = eventBuffer.splice(0, BATCH_SIZE);
    try {
        await prisma.analyticsEvent.createMany({
            data: events.map((e) => ({
                userId: e.userId,
                eventType: e.eventType,
                entityType: e.entityType,
                entityId: e.entityId,
                sessionId: e.sessionId,
                ipAddress: e.ipAddress,
                userAgent: e.userAgent,
                platform: e.platform,
                appVersion: e.appVersion,
                metadata: e.metadata ?? undefined,
                timestamp: e.timestamp,
            })),
            skipDuplicates: true,
        });
    }
    catch (error) {
        console.error('[Analytics] Flush failed:', error.message);
        // Re-add failed events to buffer (with cap to prevent memory leak)
        if (eventBuffer.length < BATCH_SIZE * 10) {
            eventBuffer.unshift(...events);
        }
    }
    finally {
        isFlushing = false;
    }
}
/**
 * Start the periodic flush timer.
 */
export function startAnalytics() {
    if (flushTimer)
        return;
    flushTimer = setInterval(() => {
        flushEvents().catch(console.error);
    }, FLUSH_INTERVAL_MS);
    // Ensure clean shutdown
    const shutdown = async () => {
        if (flushTimer) {
            clearInterval(flushTimer);
            flushTimer = null;
        }
        await flushEvents();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    console.log(`[Analytics] Started (flush: ${FLUSH_INTERVAL_MS}ms, batch: ${BATCH_SIZE})`);
}
/**
 * Force flush all remaining events (call on shutdown).
 */
export async function shutdownAnalytics() {
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
    await flushEvents();
    console.log('[Analytics] Shutdown complete');
}
/**
 * Count events by type within a date range.
 */
export async function countEventsByType(range) {
    return prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        _count: { id: true },
        where: {
            timestamp: { gte: range.from, lte: range.to },
        },
        orderBy: { _count: { id: 'desc' } },
    });
}
/**
 * Get daily event counts for a specific event type.
 */
export async function dailyEventCounts(eventType, range) {
    const result = await prisma.$queryRaw `
    SELECT DATE("timestamp") as date, COUNT(*) as count
    FROM analytics_events
    WHERE "eventType" = ${eventType}::"AnalyticsEventType"
      AND "timestamp" >= ${range.from}
      AND "timestamp" <= ${range.to}
    GROUP BY DATE("timestamp")
    ORDER BY date ASC
  `;
    return result.map((r) => ({ date: r.date, count: Number(r.count) }));
}
/**
 * Get provider performance metrics.
 */
export async function getProviderPerformance(providerId, range) {
    const [jobsCompleted, bidsPlaced, earnings, avgRating] = await Promise.all([
        prisma.serviceRequest.count({
            where: {
                selectedProviderId: providerId,
                status: 'COMPLETED',
                completedAt: { gte: range.from, lte: range.to },
            },
        }),
        prisma.bid.count({
            where: {
                providerId,
                createdAt: { gte: range.from, lte: range.to },
            },
        }),
        prisma.payment.aggregate({
            _sum: { providerPayout: true },
            where: {
                payeeId: providerId,
                status: 'COMPLETED',
                createdAt: { gte: range.from, lte: range.to },
            },
        }),
        prisma.rating.aggregate({
            _avg: { overallScore: true },
            _count: { id: true },
            where: {
                rateeId: providerId,
                createdAt: { gte: range.from, lte: range.to },
            },
        }),
    ]);
    return {
        jobsCompleted,
        bidsPlaced,
        totalEarnings: Number(earnings._sum.providerPayout || 0),
        averageRating: avgRating._avg.overallScore || 0,
        totalRatings: avgRating._count.id,
        bidToJobRatio: bidsPlaced > 0 ? jobsCompleted / bidsPlaced : 0,
    };
}
/**
 * Get platform-wide dashboard metrics.
 */
export async function getPlatformMetrics(range) {
    const [totalUsers, newUsers, totalJobs, activeJobs, totalBids, totalPayments, totalRevenue, totalDisputes, openDisputes,] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({
            where: { createdAt: { gte: range.from, lte: range.to }, deletedAt: null },
        }),
        prisma.serviceRequest.count({
            where: { createdAt: { gte: range.from, lte: range.to }, deletedAt: null },
        }),
        prisma.serviceRequest.count({
            where: {
                status: { in: ['POSTED', 'BIDDING', 'ACCEPTED', 'IN_PROGRESS'] },
                deletedAt: null,
            },
        }),
        prisma.bid.count({
            where: { createdAt: { gte: range.from, lte: range.to }, deletedAt: null },
        }),
        prisma.payment.count({
            where: { status: 'COMPLETED', createdAt: { gte: range.from, lte: range.to } },
        }),
        prisma.payment.aggregate({
            _sum: { platformCommission: true },
            where: { status: 'COMPLETED', createdAt: { gte: range.from, lte: range.to } },
        }),
        prisma.dispute.count({
            where: { createdAt: { gte: range.from, lte: range.to } },
        }),
        prisma.dispute.count({
            where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'AWAITING_RESPONSE'] } },
        }),
    ]);
    return {
        totalUsers,
        newUsers,
        totalJobs,
        activeJobs,
        totalBids,
        totalPayments,
        platformRevenue: Number(totalRevenue._sum.platformCommission || 0),
        totalDisputes,
        openDisputes,
        avgBidsPerJob: totalJobs > 0 ? totalBids / totalJobs : 0,
    };
}
/**
 * Get user activity summary.
 */
export async function getUserActivity(userId, range) {
    return prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        _count: { id: true },
        where: {
            userId,
            timestamp: { gte: range.from, lte: range.to },
        },
        orderBy: { _count: { id: 'desc' } },
    });
}
//# sourceMappingURL=analytics.js.map