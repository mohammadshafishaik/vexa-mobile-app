import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { api } from './api';

export class NotificationService {
  static async requestUserPermission() {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    } else {
      // Android 13+ requires explicit permission request
      if (Platform.Version >= 33) {
        const authStatus = await messaging().requestPermission();
        return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
      }
      return true; // Auto-granted on older Android
    }
  }

  static async getToken(): Promise<string | null> {
    try {
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  static async registerToken(userId?: string) {
    const token = await this.getToken();
    if (!token) return;

    try {
      await api.post('/users/push-token', {
        token,
        platform: Platform.OS.toUpperCase(),
        deviceId: 'device-id', // Ideally get from device info, but hardcoding placeholder for now
      });
      console.log('FCM Token registered with backend');
    } catch (error) {
      console.error('Failed to register FCM token with backend:', error);
    }
  }

  static onMessage(handler: (message: any) => void) {
    return messaging().onMessage(async remoteMessage => {
      handler(remoteMessage);
    });
  }

  static setBackgroundMessageHandler() {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
      // In a real app, you might update local storage or badges here
    });
  }
}
