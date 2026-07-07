// ═══════════════════════════════════════════════════════════════════════════════
// VEXA 2.0 — Firebase Cloud Messaging (FCM) Service
// Enhanced push notification with PushToken management, channels, and batching
// ═══════════════════════════════════════════════════════════════════════════════

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import prisma from './prisma';
import type { DevicePlatform, NotificationType } from '@prisma/client';

// ─── Initialization ─────────────────────────────────────────────────────────

let firebaseCredentials: any = null;

if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL
) {
  firebaseCredentials = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };
} else {
  try {
    const __dirname = new URL('.', import.meta.url).pathname;
    const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      firebaseCredentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }
  } catch (err) {
    // Silently ignore file read errors
  }
}

const useFirebase = !!firebaseCredentials;

if (useFirebase) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseCredentials),
      });
    }
    console.log('✅ Firebase Admin SDK initialized for push notifications');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
} else {
  console.log('⚠️  Firebase not configured — push notifications disabled');
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FAILURE_COUNT = 5; // Deactivate token after this many failures
const BATCH_SIZE = 500; // FCM limit per sendEachForMulticast call

/** Map notification types to FCM priority. */
const PRIORITY_MAP: Record<string, 'high' | 'normal'> = {
  PAYMENT_RECEIVED: 'high',
  PAYMENT_COMPLETED: 'high',
  ESCROW_HELD: 'high',
  ESCROW_RELEASED: 'high',
  DISPUTE_OPENED: 'high',
  DISPUTE_UPDATE: 'high',
  DISPUTE_RESOLVED: 'high',
  CANCELLATION: 'high',
  BID_RECEIVED: 'normal',
  BID_ACCEPTED: 'normal',
  BID_REJECTED: 'normal',
  JOB_UPDATE: 'normal',
  JOB_POSTED: 'normal',
  PROVIDER_SELECTED: 'normal',
  NEW_MESSAGE: 'normal',
  RATING_RECEIVED: 'normal',
  RATING_REMINDER: 'normal',
  SYSTEM: 'normal',
  LOCATION_UPDATE: 'normal',
  MODIFICATION_REQUEST: 'normal',
  MODIFICATION_APPROVED: 'normal',
  MODIFICATION_REJECTED: 'normal',
  KYC_UPDATE: 'normal',
  SUPPORT_TICKET: 'normal',
};

// ─── PushToken Management ───────────────────────────────────────────────────

/**
 * Register or update a push token for a user.
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: DevicePlatform,
  deviceId?: string,
  deviceName?: string
): Promise<void> {
  await prisma.pushToken.upsert({
    where: { token },
    create: {
      userId,
      token,
      platform,
      deviceId,
      deviceName,
      isActive: true,
      lastUsedAt: new Date(),
    },
    update: {
      userId, // Token may move between users (re-login)
      platform,
      deviceId,
      deviceName,
      isActive: true,
      failureCount: 0, // Reset failures on re-registration
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Deactivate a push token (e.g., on logout).
 */
export async function deactivatePushToken(token: string): Promise<void> {
  await prisma.pushToken.updateMany({
    where: { token },
    data: { isActive: false },
  });
}

/**
 * Deactivate all tokens for a user (e.g., on account deletion).
 */
export async function deactivateAllUserTokens(userId: string): Promise<void> {
  await prisma.pushToken.updateMany({
    where: { userId },
    data: { isActive: false },
  });
}

/**
 * Get all active tokens for a user.
 */
async function getActiveTokens(userId: string): Promise<string[]> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId, isActive: true },
    select: { token: true },
  });
  return tokens.map((t) => t.token);
}

/**
 * Get active tokens for multiple users.
 */
async function getActiveTokensForUsers(userIds: string[]): Promise<string[]> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds }, isActive: true },
    select: { token: true },
  });
  return tokens.map((t) => t.token);
}

/**
 * Handle failed token delivery — increment failure count and deactivate if threshold reached.
 */
async function handleFailedTokens(failedTokens: string[]): Promise<void> {
  if (failedTokens.length === 0) return;

  // Increment failure count
  await prisma.pushToken.updateMany({
    where: { token: { in: failedTokens } },
    data: { failureCount: { increment: 1 } },
  });

  // Deactivate tokens that have exceeded failure threshold
  await prisma.pushToken.updateMany({
    where: {
      token: { in: failedTokens },
      failureCount: { gte: MAX_FAILURE_COUNT },
    },
    data: { isActive: false },
  });
}

// ─── Notification Preferences ───────────────────────────────────────────────

/**
 * Check if a user has opted in for a specific notification type via push.
 */
async function shouldSendPush(userId: string, notificationType: NotificationType): Promise<boolean> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  // Default: send all (no preferences = opt-in to everything)
  if (!prefs) return true;

  // Check quiet hours
  if (prefs.quietHoursEnabled && prefs.quietHoursStart && prefs.quietHoursEnd) {
    const now = new Date();
    // Simple hour-based check (ignores timezone for now — could be enhanced)
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      if (currentTime >= start || currentTime < end) return false;
    } else {
      if (currentTime >= start && currentTime < end) return false;
    }
  }

  // Map notification type to preference field
  const channelMap: Partial<Record<NotificationType, keyof typeof prefs>> = {
    BID_RECEIVED: 'pushBidUpdates',
    BID_ACCEPTED: 'pushBidUpdates',
    BID_REJECTED: 'pushBidUpdates',
    JOB_UPDATE: 'pushJobUpdates',
    JOB_POSTED: 'pushJobUpdates',
    PROVIDER_SELECTED: 'pushJobUpdates',
    MODIFICATION_REQUEST: 'pushJobUpdates',
    MODIFICATION_APPROVED: 'pushJobUpdates',
    MODIFICATION_REJECTED: 'pushJobUpdates',
    PAYMENT_RECEIVED: 'pushPayments',
    PAYMENT_COMPLETED: 'pushPayments',
    ESCROW_HELD: 'pushPayments',
    ESCROW_RELEASED: 'pushPayments',
    NEW_MESSAGE: 'pushChat',
    DISPUTE_OPENED: 'pushDisputes',
    DISPUTE_UPDATE: 'pushDisputes',
    DISPUTE_RESOLVED: 'pushDisputes',
    SYSTEM: 'pushSystemAlerts',
    CANCELLATION: 'pushSystemAlerts',
    LOCATION_UPDATE: 'pushJobUpdates',
    RATING_RECEIVED: 'pushJobUpdates',
    RATING_REMINDER: 'pushMarketing',
    KYC_UPDATE: 'pushSystemAlerts',
    SUPPORT_TICKET: 'pushSystemAlerts',
  };

  const prefField = channelMap[notificationType];
  if (prefField && typeof prefs[prefField] === 'boolean') {
    return prefs[prefField] as boolean;
  }

  return true; // Default to send
}

// ─── Send Notifications ─────────────────────────────────────────────────────

/**
 * Send a push notification to a single user.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  notificationType: NotificationType,
  data?: Record<string, string>
): Promise<boolean> {
  if (!useFirebase) {
    console.log('[FCM] Push skipped (Firebase not configured)');
    return false;
  }

  // Check user preferences
  const shouldSend = await shouldSendPush(userId, notificationType);
  if (!shouldSend) {
    console.log(`[FCM] Push suppressed for user ${userId} (preference: ${notificationType})`);
    return false;
  }

  const tokens = await getActiveTokens(userId);
  if (tokens.length === 0) {
    console.log(`[FCM] No active tokens for user ${userId}`);
    return false;
  }

  const priority = PRIORITY_MAP[notificationType] || 'normal';

  try {
    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      data: {
        ...data,
        notificationType,
        timestamp: new Date().toISOString(),
      },
      tokens,
      android: {
        priority,
        notification: {
          channelId: priority === 'high' ? 'vexa_urgent' : 'vexa_default',
          sound: priority === 'high' ? 'default' : undefined,
          priority: priority === 'high' ? 'max' : 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: priority === 'high' ? 'default' : undefined,
            badge: 1,
            contentAvailable: true,
          },
        },
        headers: {
          'apns-priority': priority === 'high' ? '10' : '5',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Handle failures
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token'
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await handleFailedTokens(failedTokens);
    }

    // Update lastUsedAt for successful tokens
    const successTokens = tokens.filter((_, idx) => response.responses[idx].success);
    if (successTokens.length > 0) {
      await prisma.pushToken.updateMany({
        where: { token: { in: successTokens } },
        data: { lastUsedAt: new Date() },
      });
    }

    console.log(`[FCM] Sent to ${userId}: ${response.successCount}/${tokens.length} delivered`);
    return response.successCount > 0;
  } catch (error: any) {
    console.error(`[FCM] Error sending to ${userId}:`, error.message);
    return false;
  }
}

/**
 * Send a data-only message (no visible notification) for background processing.
 */
export async function sendDataMessage(
  userId: string,
  data: Record<string, string>
): Promise<boolean> {
  if (!useFirebase) return false;

  const tokens = await getActiveTokens(userId);
  if (tokens.length === 0) return false;

  try {
    const message: admin.messaging.MulticastMessage = {
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      tokens,
      android: { priority: 'high' }, // Ensure data messages wake the app
      apns: {
        payload: { aps: { contentAvailable: true } },
        headers: { 'apns-priority': '5', 'apns-push-type': 'background' },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return response.successCount > 0;
  } catch (error: any) {
    console.error(`[FCM] Data message error for ${userId}:`, error.message);
    return false;
  }
}

/**
 * Send push notification to multiple users (batch).
 * Splits into chunks of 500 tokens (FCM limit).
 */
export async function sendMulticastNotification(
  userIds: string[],
  title: string,
  body: string,
  notificationType: NotificationType,
  data?: Record<string, string>
): Promise<number> {
  if (!useFirebase || userIds.length === 0) return 0;

  const allTokens = await getActiveTokensForUsers(userIds);
  if (allTokens.length === 0) return 0;

  let totalSuccess = 0;
  const priority = PRIORITY_MAP[notificationType] || 'normal';

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    const batchTokens = allTokens.slice(i, i + BATCH_SIZE);

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: { title, body },
        data: {
          ...data,
          notificationType,
          timestamp: new Date().toISOString(),
        },
        tokens: batchTokens,
        android: {
          priority,
          notification: {
            channelId: priority === 'high' ? 'vexa_urgent' : 'vexa_default',
          },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      totalSuccess += response.successCount;

      // Cleanup invalid tokens
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            failedTokens.push(batchTokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await handleFailedTokens(failedTokens);
      }
    } catch (error: any) {
      console.error(`[FCM] Multicast batch error:`, error.message);
    }
  }

  console.log(`[FCM] Multicast: ${totalSuccess}/${allTokens.length} delivered to ${userIds.length} users`);
  return totalSuccess;
}

/**
 * Send to a topic (e.g., all users watching a job category).
 */
export async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!useFirebase) return false;

  try {
    await admin.messaging().send({
      topic,
      notification: { title, body },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`[FCM] Sent to topic: ${topic}`);
    return true;
  } catch (error: any) {
    console.error(`[FCM] Topic send error (${topic}):`, error.message);
    return false;
  }
}

/**
 * Subscribe user tokens to a topic.
 */
export async function subscribeToTopic(userId: string, topic: string): Promise<void> {
  if (!useFirebase) return;
  const tokens = await getActiveTokens(userId);
  if (tokens.length > 0) {
    await admin.messaging().subscribeToTopic(tokens, topic);
  }
}

/**
 * Unsubscribe user tokens from a topic.
 */
export async function unsubscribeFromTopic(userId: string, topic: string): Promise<void> {
  if (!useFirebase) return;
  const tokens = await getActiveTokens(userId);
  if (tokens.length > 0) {
    await admin.messaging().unsubscribeFromTopic(tokens, topic);
  }
}

// ─── Stale Token Cleanup ────────────────────────────────────────────────────

/**
 * Deactivate tokens not used in the last N days.
 * Should be called by a daily cron job.
 */
export async function cleanupStaleTokens(staleDays: number = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);

  const result = await prisma.pushToken.updateMany({
    where: {
      isActive: true,
      lastUsedAt: { lt: cutoff },
    },
    data: { isActive: false },
  });

  if (result.count > 0) {
    console.log(`[FCM] Deactivated ${result.count} stale tokens (unused for ${staleDays}+ days)`);
  }

  return result.count;
}

export default admin;
