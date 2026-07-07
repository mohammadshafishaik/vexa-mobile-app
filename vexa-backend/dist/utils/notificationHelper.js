import { sendPushNotification } from '../lib/firebase';
/**
 * Sends a push notification via FCM directly to the lock screen / home screen
 */
export async function createAndPushNotification(params) {
    const { userId, type, title, body, data } = params;
    try {
        // Convert data to string values for FCM
        const fcmData = {};
        if (data) {
            Object.keys(data).forEach((key) => {
                fcmData[key] = String(data[key]);
            });
        }
        // Direct lock screen / home screen delivery via FCM
        await sendPushNotification(userId, title, body, type, fcmData);
        return { id: 'push_only', userId, type, title, body, isRead: false, createdAt: new Date() };
    }
    catch (error) {
        console.error('Push notification helper error:', error);
        return null;
    }
}
export async function markNotificationAsRead(notificationId) {
    return { count: 0 };
}
export async function markAllNotificationsAsRead(userId) {
    return { count: 0 };
}
export async function getUnreadCount(userId) {
    return 0;
}
//# sourceMappingURL=notificationHelper.js.map