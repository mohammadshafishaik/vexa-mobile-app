# VEXA Production Setup Guide

This guide walks you through setting up all third-party services required for VEXA production deployment.

## Table of Contents
1. [Firebase Setup (Google Sign-In & Push Notifications)](#firebase-setup)
2. [Cloudinary Setup (Image Uploads)](#cloudinary-setup)
3. [Razorpay Setup (Payments)](#razorpay-setup)
4. [Backend Deployment (Render.com)](#backend-deployment)
5. [APK Generation](#apk-generation)

---

## Firebase Setup

Firebase is required for:
- Google Sign-In authentication
- Push notifications (FCM)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `vexa-production`
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Add Android App

1. In Firebase Console, click the Android icon
2. Enter package name: `com.vexa.app` (must match `android/app/build.gradle`)
3. Enter app nickname: `VEXA`
4. Click "Register app"

### Step 3: Download google-services.json

1. Download the `google-services.json` file
2. Place it in: `vexa/android/app/google-services.json`

### Step 4: Get SHA-1 Certificate

Run this command in the `vexa/android` directory:

```bash
cd vexa/android
./gradlew signingReport
```

Copy the SHA-1 fingerprint from the output (under `debug` variant).

### Step 5: Add SHA-1 to Firebase

1. In Firebase Console, go to Project Settings
2. Scroll to "Your apps" section
3. Click on your Android app
4. Click "Add fingerprint"
5. Paste the SHA-1 fingerprint
6. Click "Save"

### Step 6: Enable Google Sign-In

1. In Firebase Console, go to Authentication
2. Click "Get started"
3. Click "Sign-in method" tab
4. Enable "Google" provider
5. Enter support email
6. Click "Save"

### Step 7: Get OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to "APIs & Services" > "Credentials"
4. Find the "Web client" OAuth 2.0 Client ID
5. Copy the Client ID and Client Secret

Update `vexa-backend/.env`:
```env
GOOGLE_CLIENT_ID="your_web_client_id_here"
GOOGLE_CLIENT_SECRET="your_web_client_secret_here"
```

### Step 8: Setup Push Notifications

1. In Firebase Console, go to Project Settings
2. Click "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file
5. Extract these values from the JSON:
   - `project_id`
   - `private_key`
   - `client_email`

Update `vexa-backend/.env`:
```env
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
```

**Note:** The private key must include `\n` for newlines.

### Step 9: Configure Frontend

Update `vexa/android/app/build.gradle` to include Google Services plugin:

```gradle
apply plugin: 'com.google.gms.google-services'
```

Update `vexa/android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

---

## Cloudinary Setup

Cloudinary provides free cloud storage for images.

### Step 1: Create Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. Verify your email

### Step 2: Get API Credentials

1. Go to Dashboard
2. Copy these values:
   - Cloud Name
   - API Key
   - API Secret

### Step 3: Update Backend Environment

Update `vexa-backend/.env`:
```env
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

**Note:** If you don't configure Cloudinary, images will be stored locally (not recommended for production).

---

## Razorpay Setup

Razorpay is already configured with test credentials. For production:

### Step 1: Create Account

1. Go to [Razorpay](https://razorpay.com/)
2. Sign up for a business account
3. Complete KYC verification

### Step 2: Get Live API Keys

1. Go to Dashboard > Settings > API Keys
2. Switch to "Live Mode"
3. Generate Live API Keys
4. Copy Key ID and Key Secret

### Step 3: Update Backend Environment

Update `vexa-backend/.env`:
```env
RAZORPAY_KEY_ID="rzp_live_xxxxx"
RAZORPAY_KEY_SECRET="your_live_secret"
```

---

## Backend Deployment

Deploy your backend to Render.com (free tier available).

### Step 1: Create Render Account

1. Go to [Render.com](https://render.com/)
2. Sign up with GitHub

### Step 2: Create PostgreSQL Database

1. Click "New +" > "PostgreSQL"
2. Name: `vexa-db`
3. Select free tier
4. Click "Create Database"
5. Copy the "Internal Database URL"

### Step 3: Create Web Service

1. Click "New +" > "Web Service"
2. Connect your GitHub repository
3. Select the `vexa-backend` directory
4. Configure:
   - Name: `vexa-backend`
   - Environment: `Node`
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`
   - Instance Type: Free

### Step 4: Add Environment Variables

In Render dashboard, add all environment variables from `.env`:

```
DATABASE_URL=<your_render_postgres_url>
JWT_SECRET=<generate_random_string>
JWT_REFRESH_SECRET=<generate_random_string>
BETTER_AUTH_SECRET=<generate_random_string>
BETTER_AUTH_URL=https://vexa-backend-xxxxx.onrender.com
RAZORPAY_KEY_ID=<your_key>
RAZORPAY_KEY_SECRET=<your_secret>
GOOGLE_CLIENT_ID=<your_client_id>
GOOGLE_CLIENT_SECRET=<your_client_secret>
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
FIREBASE_PROJECT_ID=<your_project_id>
FIREBASE_PRIVATE_KEY=<your_private_key>
FIREBASE_CLIENT_EMAIL=<your_client_email>
```

### Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Copy your backend URL: `https://vexa-backend-xxxxx.onrender.com`

### Step 6: Update Frontend API URL

Update `vexa/src/services/api.ts`:

```typescript
// For production
const BASE_URL = 'https://vexa-backend-xxxxx.onrender.com/api';

// For development
// const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// const BASE_URL = `http://${HOST}:3000/api`;
```

---

## APK Generation

### Step 1: Generate Signing Key

```bash
cd vexa/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore vexa-release-key.keystore -alias vexa-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Enter a strong password and remember it.

### Step 2: Configure Gradle

Create `vexa/android/gradle.properties`:

```properties
VEXA_UPLOAD_STORE_FILE=vexa-release-key.keystore
VEXA_UPLOAD_KEY_ALIAS=vexa-key-alias
VEXA_UPLOAD_STORE_PASSWORD=your_keystore_password
VEXA_UPLOAD_KEY_PASSWORD=your_key_password
```

Update `vexa/android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('VEXA_UPLOAD_STORE_FILE')) {
                storeFile file(VEXA_UPLOAD_STORE_FILE)
                storePassword VEXA_UPLOAD_STORE_PASSWORD
                keyAlias VEXA_UPLOAD_KEY_ALIAS
                keyPassword VEXA_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build Release APK

```bash
cd vexa/android
./gradlew assembleRelease
```

The APK will be generated at:
```
vexa/android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Test APK

1. Transfer the APK to your Android device
2. Enable "Install from Unknown Sources" in Settings
3. Install and test the APK

---

## Verification Checklist

- [ ] Firebase configured and `google-services.json` added
- [ ] Google Sign-In working
- [ ] Push notifications working
- [ ] Cloudinary configured for image uploads
- [ ] Razorpay payments working
- [ ] Backend deployed to Render.com
- [ ] Frontend API URL updated to production
- [ ] Release APK generated and tested
- [ ] All features tested on physical device

---

## Troubleshooting

### Google Sign-In Not Working

- Verify SHA-1 fingerprint is added to Firebase
- Check package name matches in Firebase and `build.gradle`
- Ensure `google-services.json` is in the correct location

### Push Notifications Not Working

- Verify Firebase credentials in backend `.env`
- Check device token is being registered
- Test with Firebase Console > Cloud Messaging

### Images Not Uploading

- Check Cloudinary credentials
- Verify network permissions in `AndroidManifest.xml`
- Check backend logs for upload errors

### Payment Failing

- Verify Razorpay keys are correct
- Check signature verification logic
- Test with Razorpay test cards

### Backend Not Accessible

- Check Render.com deployment logs
- Verify all environment variables are set
- Test database connection

---

## Support

For issues or questions, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Render Documentation](https://render.com/docs)
