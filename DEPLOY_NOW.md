# 🚀 VEXA Production Deployment Guide

**Status:** Ready to Deploy ✅

All configurations are complete. Follow these steps to deploy your app.

---

## 📋 Step 1: Deploy Backend to Render.com (15 minutes)

### A. Create PostgreSQL Database

1. Go to https://dashboard.render.com/
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name:** `vexa-db`
   - **Database:** `vexa_db`
   - **User:** `vexa_user`
   - **Region:** Choose closest to you
   - **Instance Type:** Free
4. Click "Create Database"
5. **IMPORTANT:** Copy the "Internal Database URL" (looks like: `postgresql://vexa_user:xxxxx@dpg-xxxxx/vexa_db`)

### B. Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository (or use "Public Git repository")
3. If using public repo, enter: `<your-repo-url>`
4. Configure:
   - **Name:** `vexa-backend`
   - **Region:** Same as database
   - **Branch:** `main` (or your branch name)
   - **Root Directory:** `vexa-backend`
   - **Runtime:** Node
   - **Build Command:** 
     ```
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command:**
     ```
     npm start
     ```
   - **Instance Type:** Free

### C. Add Environment Variables

Click "Advanced" → "Add Environment Variable" and add these:

```env
DATABASE_URL=<paste_internal_database_url_from_step_A>
JWT_SECRET=<generate_a_strong_random_string>
JWT_REFRESH_SECRET=<generate_a_strong_random_string>
BETTER_AUTH_SECRET=<generate_a_strong_random_string>
BETTER_AUTH_URL=https://vexa-backend.onrender.com
PORT=3000
RAZORPAY_KEY_ID=<your_razorpay_key_id>
RAZORPAY_KEY_SECRET=<your_razorpay_key_secret>
GOOGLE_CLIENT_ID=<your_google_web_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>
FIREBASE_PROJECT_ID=<your_firebase_project_id>
FIREBASE_PRIVATE_KEY=<your_firebase_private_key>
FIREBASE_CLIENT_EMAIL=<your_firebase_client_email>
```

> ⚠️ Fill in your actual values from your `.env` file. Never commit real secrets to Git.

**IMPORTANT:** Replace `BETTER_AUTH_URL` with your actual Render URL after deployment (it will be shown after you create the service, like `https://vexa-backend-xxxxx.onrender.com`)

### D. Deploy

1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Once deployed, you'll see your backend URL: `https://vexa-backend-xxxxx.onrender.com`
4. **COPY THIS URL** - you'll need it for the frontend

### E. Update BETTER_AUTH_URL

1. Go back to your web service settings
2. Find "Environment" section
3. Edit `BETTER_AUTH_URL` and replace with your actual URL
4. Click "Save Changes"
5. Service will redeploy automatically

### F. Verify Deployment

Open in browser: `https://your-backend-url.onrender.com/api/health`

You should see:
```json
{
  "status": "ok",
  "timestamp": "2026-04-12T..."
}
```

✅ **Backend is now live!**

---

## 📱 Step 2: Update Frontend API URL (2 minutes)

Now that your backend is deployed, update the frontend to use the production URL.

### Update API Configuration

Open `vexa/src/services/api.ts` and replace the BASE_URL:

**BEFORE:**
```typescript
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const BASE_URL = `http://${HOST}:3000/api`;
```

**AFTER:**
```typescript
// Production backend URL
const BASE_URL = 'https://your-backend-url.onrender.com/api';
```

**Replace `your-backend-url` with your actual Render URL from Step 1D**

---

## 🔨 Step 3: Build Debug APK (5 minutes)

Now let's build the APK file.

### A. Install Dependencies (if not done)

```bash
cd vexa
npm install
```

### B. Build APK

```bash
cd android
./gradlew assembleDebug
```

This will take 3-5 minutes. You'll see output like:
```
BUILD SUCCESSFUL in 3m 45s
```

### C. Find Your APK

The APK will be at:
```
vexa/android/app/build/outputs/apk/debug/app-debug.apk
```

✅ **APK is ready!**

---

## 📲 Step 4: Install APK on Your Phone

### Option A: USB Transfer

1. Connect your phone to computer via USB
2. Copy `app-debug.apk` to your phone
3. On phone, go to Files → Downloads
4. Tap on `app-debug.apk`
5. Allow "Install from Unknown Sources" if prompted
6. Tap "Install"

### Option B: ADB Install

```bash
cd vexa/android
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Option C: Email/Cloud

1. Email the APK to yourself
2. Open email on phone
3. Download and install

---

## ✅ Step 5: Test Your App

### First Launch

1. Open VEXA app on your phone
2. Register a new account
3. Try posting a job with images
4. Test all features

### Test Checklist

- [ ] User registration works
- [ ] Login works
- [ ] Google Sign-In works
- [ ] Post job with images
- [ ] Images upload to Cloudinary
- [ ] Real-time bidding works
- [ ] Push notifications work
- [ ] Payments work (test mode)
- [ ] All screens load properly

---

## 🔧 Troubleshooting

### Backend not accessible

**Check:**
1. Backend URL is correct in `api.ts`
2. Backend is running on Render (check dashboard)
3. No typos in URL

**Test:**
```bash
curl https://your-backend-url.onrender.com/api/health
```

### APK build fails

**Solution:**
```bash
cd vexa/android
./gradlew clean
./gradlew assembleDebug
```

### Google Sign-In not working

**Check:**
1. `google-services.json` is in `vexa/android/app/`
2. SHA-1 fingerprint added to Firebase
3. Rebuild APK after adding google-services.json

### Images not uploading

**Check:**
1. Cloudinary credentials in Render environment variables
2. Backend logs on Render dashboard
3. Network connection on phone

### Push notifications not working

**Check:**
1. Firebase credentials in Render environment variables
2. Device token registered (check backend logs)
3. Test from Firebase Console

---

## 🎉 Success!

Your app is now:
- ✅ Backend deployed on Render.com
- ✅ Database hosted on Render.com
- ✅ Images stored on Cloudinary
- ✅ Firebase configured
- ✅ APK generated and installable

---

## 📞 Next Steps

### For Razorpay Live Mode

Once your app is live, you can enable Razorpay live mode:

1. In Razorpay dashboard, provide your app link: `https://vexa-backend-xxxxx.onrender.com`
2. Complete verification
3. Get live API keys
4. Update environment variables on Render:
   - `RAZORPAY_KEY_ID=rzp_live_xxxxx`
   - `RAZORPAY_KEY_SECRET=xxxxx`

### For Play Store Release

When ready to publish on Play Store:

1. Generate release keystore
2. Build release APK
3. Create Play Store listing
4. Upload APK
5. Submit for review

See `SETUP_GUIDE.md` for detailed instructions.

---

## 🔐 Important Security Notes

1. **Never commit `.env` files** to Git
2. **Keep your Render dashboard secure**
3. **Rotate secrets periodically**
4. **Monitor backend logs** for suspicious activity
5. **Enable 2FA** on all accounts (Render, Firebase, Cloudinary, Razorpay)

---

## 📊 Your Production URLs

**Backend API:** `https://your-backend-url.onrender.com`
**Health Check:** `https://your-backend-url.onrender.com/api/health`
**Database:** Render PostgreSQL (internal)
**Images:** Cloudinary CDN
**Auth:** Firebase Authentication
**Payments:** Razorpay (test mode)

---

**Congratulations! Your VEXA app is now in production! 🎊**
