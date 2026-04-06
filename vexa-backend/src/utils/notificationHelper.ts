import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { getIO } from '../lib/socket';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Create a notification in the database and push it via Socket.IO
 */
export async function createAndPushNotification(params: CreateNotificationParams) {
  const { userId, type, title, body, data } = params;

  try {
    // Create notification in DB
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        body,
        data: data ? (data as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });

    // Push via Socket.IO to the user's room
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:new', notification);
    } catch (socketError) {
      // Socket might not be initialized in tests
      console.warn('[NotificationHelper] Socket.IO not available:', socketError);
    }

    return notification;
  } catch (error) {
    console.error('[NotificationHelper] Failed to create notification:', error);
    throw error;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  const promises = userIds.map((userId) =>
    createAndPushNotification({ ...params, userId })
  );
  return Promise.allSettled(promises);
}
