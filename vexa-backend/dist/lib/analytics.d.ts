import type { AnalyticsEventType, DevicePlatform } from '@prisma/client';
export interface AnalyticsEventInput {
    userId?: string;
    eventType: AnalyticsEventType;
    entityType?: string;
    entityId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    platform?: DevicePlatform;
    appVersion?: string;
    metadata?: Record<string, any>;
}
/**
 * Track an analytics event. Events are buffered and flushed in batches.
 */
export declare function trackEvent(event: AnalyticsEventInput): void;
/**
 * Convenience method for tracking common events with type safety.
 */
export declare const track: {
    pageView(userId: string, page: string, meta?: Record<string, any>): void;
    jobCreated(userId: string, jobId: string, meta?: Record<string, any>): void;
    jobViewed(userId: string, jobId: string): void;
    bidPlaced(userId: string, bidId: string, jobId: string, amount: number): void;
    bidAccepted(userId: string, bidId: string, jobId: string): void;
    paymentCompleted(userId: string, paymentId: string, amount: number): void;
    paymentFailed(userId: string, paymentId: string, reason: string): void;
    disputeOpened(userId: string, disputeId: string, jobId: string): void;
    ratingSubmitted(userId: string, ratingId: string, score: number): void;
    chatMessageSent(userId: string, chatRoomId: string): void;
    login(userId: string, platform?: DevicePlatform, ipAddress?: string): void;
    signup(userId: string, platform?: DevicePlatform): void;
    error(userId: string | undefined, errorMessage: string, meta?: Record<string, any>): void;
    voiceBookingStarted(userId: string, bookingId: string): void;
    aiMatchRequested(userId: string, jobId: string, matchCount: number): void;
};
/**
 * Start the periodic flush timer.
 */
export declare function startAnalytics(): void;
/**
 * Force flush all remaining events (call on shutdown).
 */
export declare function shutdownAnalytics(): Promise<void>;
export interface DateRange {
    from: Date;
    to: Date;
}
/**
 * Count events by type within a date range.
 */
export declare function countEventsByType(range: DateRange): Promise<(import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.AnalyticsEventGroupByOutputType, "eventType"[]> & {
    _count: {
        id: number;
    };
})[]>;
/**
 * Get daily event counts for a specific event type.
 */
export declare function dailyEventCounts(eventType: AnalyticsEventType, range: DateRange): Promise<{
    date: string;
    count: number;
}[]>;
/**
 * Get provider performance metrics.
 */
export declare function getProviderPerformance(providerId: string, range: DateRange): Promise<{
    jobsCompleted: number;
    bidsPlaced: number;
    totalEarnings: number;
    averageRating: number;
    totalRatings: number;
    bidToJobRatio: number;
}>;
/**
 * Get platform-wide dashboard metrics.
 */
export declare function getPlatformMetrics(range: DateRange): Promise<{
    totalUsers: number;
    newUsers: number;
    totalJobs: number;
    activeJobs: number;
    totalBids: number;
    totalPayments: number;
    platformRevenue: number;
    totalDisputes: number;
    openDisputes: number;
    avgBidsPerJob: number;
}>;
/**
 * Get user activity summary.
 */
export declare function getUserActivity(userId: string, range: DateRange): Promise<(import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.AnalyticsEventGroupByOutputType, "eventType"[]> & {
    _count: {
        id: number;
    };
})[]>;
//# sourceMappingURL=analytics.d.ts.map