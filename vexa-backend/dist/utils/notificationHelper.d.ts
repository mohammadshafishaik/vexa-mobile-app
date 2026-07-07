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
export declare function createAndPushNotification(params: CreateNotificationParams): Promise<{
    id: string;
    userId: string;
    type: import("@prisma/client").$Enums.NotificationType;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: Date;
} | null>;
export declare function markNotificationAsRead(notificationId: string): Promise<{
    count: number;
}>;
export declare function markAllNotificationsAsRead(userId: string): Promise<{
    count: number;
}>;
export declare function getUnreadCount(userId: string): Promise<number>;
export {};
//# sourceMappingURL=notificationHelper.d.ts.map