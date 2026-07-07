import admin from 'firebase-admin';
import type { DevicePlatform, NotificationType } from '@prisma/client';
/**
 * Register or update a push token for a user.
 */
export declare function registerPushToken(userId: string, token: string, platform: DevicePlatform, deviceId?: string, deviceName?: string): Promise<void>;
/**
 * Deactivate a push token (e.g., on logout).
 */
export declare function deactivatePushToken(token: string): Promise<void>;
/**
 * Deactivate all tokens for a user (e.g., on account deletion).
 */
export declare function deactivateAllUserTokens(userId: string): Promise<void>;
/**
 * Send a push notification to a single user.
 */
export declare function sendPushNotification(userId: string, title: string, body: string, notificationType: NotificationType, data?: Record<string, string>): Promise<boolean>;
/**
 * Send a data-only message (no visible notification) for background processing.
 */
export declare function sendDataMessage(userId: string, data: Record<string, string>): Promise<boolean>;
/**
 * Send push notification to multiple users (batch).
 * Splits into chunks of 500 tokens (FCM limit).
 */
export declare function sendMulticastNotification(userIds: string[], title: string, body: string, notificationType: NotificationType, data?: Record<string, string>): Promise<number>;
/**
 * Send to a topic (e.g., all users watching a job category).
 */
export declare function sendToTopic(topic: string, title: string, body: string, data?: Record<string, string>): Promise<boolean>;
/**
 * Subscribe user tokens to a topic.
 */
export declare function subscribeToTopic(userId: string, topic: string): Promise<void>;
/**
 * Unsubscribe user tokens from a topic.
 */
export declare function unsubscribeFromTopic(userId: string, topic: string): Promise<void>;
/**
 * Deactivate tokens not used in the last N days.
 * Should be called by a daily cron job.
 */
export declare function cleanupStaleTokens(staleDays?: number): Promise<number>;
export default admin;
//# sourceMappingURL=firebase.d.ts.map