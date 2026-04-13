import prisma from '../lib/prisma';
import { getIO } from '../lib/socket';
import { sendMulticastNotification } from '../lib/firebase';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Creates a notification in the database, emits it via Socket.io,
 * and sends a push notification if the user has device tokens
 */
export async function createAndPushNotification(params: CreateNotificationParams) {
  const { userId, type, title, body, data } = params;

  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data || {},
      },
    });

    // Emit via Socket.io for real-time in-app notifications
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:new', notification);
    } catch (socketError) {
      console.error('Socket.io emit error:', socketError);
    }

    // Send push notification if user has device tokens
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { deviceTokens: true },
      });

      if (user && user.deviceTokens && user.deviceTokens.length > 0) {
        // Convert data to string values for FCM
        const fcmData: Record<string, string> = {};
        if (data) {
          Object.keys(data).forEach((key) => {
            fcmData[key] = String(data[key]);
          });
        }

        await sendMulticastNotification(user.deviceTokens, title, body, fcmData);
      }
    } catch (pushError) {
      console.error('Push notification error:', pushError);
    }

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error);
    throw error;
  }
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Marks all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
