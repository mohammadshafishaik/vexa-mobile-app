import admin from 'firebase-admin';

import fs from 'fs';
import path from 'path';

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
    console.error('Error reading firebase-service-account.json', err);
  }
}

const useFirebase = !!firebaseCredentials;

if (useFirebase) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseCredentials),
    });
    console.log('✅ Firebase Admin SDK initialized for push notifications');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
} else {
  console.log('⚠️  Firebase not configured - push notifications disabled');
}

export const sendPushNotification = async (
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> => {
  if (!useFirebase) {
    console.log('Push notification skipped (Firebase not configured)');
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: deviceToken,
    };

    await admin.messaging().send(message);
    console.log(`✅ Push notification sent to ${deviceToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
};

export const sendMulticastNotification = async (
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> => {
  if (!useFirebase || deviceTokens.length === 0) {
    return 0;
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: deviceTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Sent ${response.successCount}/${deviceTokens.length} push notifications`);
    return response.successCount;
  } catch (error) {
    console.error('Multicast notification error:', error);
    return 0;
  }
};

export default admin;
