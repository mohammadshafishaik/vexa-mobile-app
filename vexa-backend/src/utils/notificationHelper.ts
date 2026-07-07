import { sendPushNotification } from '../lib/firebase';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Sends a push notification via FCM directly to the lock screen / home screen
 */
export async function createAndPushNotification(params: CreateNotificationParams) {
  const { userId, type, title, body, data } = params;

  try {
    // Convert data to string values for FCM
    const fcmData: Record<string, string> = {};
    if (data) {
      Object.keys(data).forEach((key) => {
        fcmData[key] = String(data[key]);
      });
    }

    // Direct lock screen / home screen delivery via FCM
    await sendPushNotification(userId, title, body, type, fcmData);

    return { id: 'push_only', userId, type, title, body, isRead: false, createdAt: new Date() };
  } catch (error) {
    console.error('Push notification helper error:', error);
    return null;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  return { count: 0 };
}

export async function markAllNotificationsAsRead(userId: string) {
  return { count: 0 };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return 0;
}
