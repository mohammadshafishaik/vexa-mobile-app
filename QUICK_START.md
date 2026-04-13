# VEXA Quick Start Guide

Get VEXA up and running in minutes!

## 🚀 Quick Setup (5 Minutes)

### 1. Install Backend Dependencies

```bash
cd vexa-backend
npm install
```

### 2. Run Database Migration

```bash
npx prisma migrate dev --name add_kyc_and_scheduling
npx prisma generate
```

### 3. Start Backend Server

```bash
npm run dev
```

You should see:
```
🚀 VEXA Backend running on http://localhost:3000
📡 Socket.io ready for real-time events
```

### 4. Start Frontend (New Terminal)

```bash
cd vexa
npm start
```

### 5. Run on Android

```bash
# In another terminal
cd vexa
npm run android
```

---

## ✅ Verify Everything Works

### Test 1: Backend Health Check

Open browser: http://localhost:3000/api/health

Should see:
```json
{
  "status": "ok",
  "timestamp": "2026-04-12T..."
}
```

### Test 2: Image Upload

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-image.jpg"
```

### Test 3: Create Test Job

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Job",
    "description": "Test description",
    "category": "Plumbing",
    "location": "Mumbai",
    "originalPrice": 500
  }'
```

---

## 🔧 Common Issues & Fixes

### Issue: "Cannot connect to database"

**Fix:**
```bash
# Check if PostgreSQL is running
psql -U postgres

# If not installed, install PostgreSQL:
# macOS: brew install postgresql
# Start: brew services start postgresql

# Create database
createdb vexa_db
```

### Issue: "Module not found"

**Fix:**
```bash
# Backend
cd vexa-backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd vexa
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Port 3000 already in use"

**Fix:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Issue: Android build fails

**Fix:**
```bash
cd vexa/android
./gradlew clean
cd ..
npm run android
```

---

## 📦 What's Already Working

✅ User authentication (email/password)
✅ Job posting and browsing
✅ Real-time bidding system
✅ Job modifications
✅ Payment processing (Razorpay test mode)
✅ Ratings and reviews
✅ Disputes
✅ Notifications
✅ Image uploads (local storage)
✅ Socket.io real-time updates

---

## 🎯 What Needs Configuration

### Optional (App works without these):

1. **Cloudinary** (for cloud image storage)
   - Without: Images stored locally
   - With: Images stored in cloud
   - Setup time: 5 minutes
   - See: SETUP_GUIDE.md

2. **Firebase** (for Google Sign-In & Push Notifications)
   - Without: Email/password auth only, no push notifications
   - With: Google Sign-In + Push notifications
   - Setup time: 15 minutes
   - See: SETUP_GUIDE.md

### Required for Production:

3. **Backend Deployment** (Render.com)
   - Setup time: 10 minutes
   - See: SETUP_GUIDE.md

4. **APK Generation**
   - Setup time: 5 minutes
   - See: SETUP_GUIDE.md

---

## 🧪 Test Credentials

### Test User 1 (Customer)
- Email: customer@test.com
- Password: Test123!

### Test User 2 (Provider)
- Email: provider@test.com
- Password: Test123!

### Razorpay Test Cards

**Success:**
- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

**Failure:**
- Card: 4000 0000 0000 0002

---

## 📱 Test on Physical Device

### Option 1: USB Debugging

1. Enable Developer Options on Android
2. Enable USB Debugging
3. Connect phone via USB
4. Run: `npm run android`

### Option 2: APK Install

1. Generate APK:
```bash
cd vexa/android
./gradlew assembleDebug
```

2. APK location:
```
vexa/android/app/build/outputs/apk/debug/app-debug.apk
```

3. Transfer to phone and install

---

## 🎨 Customize Your App

### Change App Name

1. Edit `vexa/app.json`:
```json
{
  "name": "YourAppName",
  "displayName": "Your App Name"
}
```

2. Edit `vexa/android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Your App Name</string>
```

### Change Package Name

1. Edit `vexa/android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId "com.yourcompany.yourapp"
}
```

2. Rename folders in `vexa/android/app/src/main/java/`

### Change App Icon

1. Create 1024x1024 PNG logo
2. Use: https://appicon.co/
3. Replace files in `vexa/android/app/src/main/res/mipmap-*`

---

## 📊 Monitor Your App

### Backend Logs

```bash
cd vexa-backend
npm run dev
# Watch console for logs
```

### Frontend Logs

```bash
# React Native logs
npx react-native log-android

# Or use Flipper
npx react-native doctor
```

### Database Inspection

```bash
cd vexa-backend
npx prisma studio
# Opens at http://localhost:5555
```

---

## 🔄 Development Workflow

### Making Backend Changes

1. Edit files in `vexa-backend/src/`
2. Server auto-restarts (tsx watch)
3. Test changes immediately

### Making Frontend Changes

1. Edit files in `vexa/src/`
2. Save file
3. App reloads automatically (Fast Refresh)

### Database Schema Changes

1. Edit `vexa-backend/prisma/schema.prisma`
2. Run migration:
```bash
npx prisma migrate dev --name your_change_name
npx prisma generate
```
3. Restart backend server

---

## 🚢 Deploy to Production

### Quick Deploy Checklist

1. **Setup Firebase** (15 min)
   - Create project
   - Add Android app
   - Download google-services.json
   - Configure OAuth

2. **Setup Cloudinary** (5 min)
   - Create account
   - Get API credentials
   - Update .env

3. **Deploy Backend** (10 min)
   - Create Render.com account
   - Create PostgreSQL database
   - Create Web Service
   - Add environment variables

4. **Update Frontend** (2 min)
   - Change API URL in api.ts
   - Test connection

5. **Generate APK** (5 min)
   - Create signing key
   - Configure gradle
   - Build release APK

**Total Time: ~40 minutes**

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

---

## 📚 Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - What's implemented
- [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md) - Code examples
- [VEXA_SRS.md](./VEXA_SRS.md) - Requirements specification

---

## 💡 Pro Tips

1. **Use Prisma Studio** for easy database inspection
   ```bash
   npx prisma studio
   ```

2. **Use React Native Debugger** for better debugging
   ```bash
   brew install --cask react-native-debugger
   ```

3. **Use Postman** for API testing
   - Import collection from backend routes
   - Test all endpoints

4. **Enable Hot Reload** in React Native
   - Shake device → Enable Fast Refresh

5. **Check Logs** when something breaks
   - Backend: Terminal running `npm run dev`
   - Frontend: `npx react-native log-android`

---

## 🆘 Need Help?

### Check These First:

1. **Backend not starting?**
   - Check PostgreSQL is running
   - Check .env file exists
   - Check port 3000 is free

2. **Frontend not connecting?**
   - Check backend is running
   - Check API URL in api.ts
   - Check network permissions

3. **Build failing?**
   - Clean build: `cd android && ./gradlew clean`
   - Clear cache: `npm start -- --reset-cache`
   - Reinstall: `rm -rf node_modules && npm install`

### Still Stuck?

1. Check error messages carefully
2. Search error on Google/Stack Overflow
3. Check React Native documentation
4. Check Prisma documentation

---

## ✨ You're All Set!

Your VEXA app is now running locally. Next steps:

1. ✅ Test all features locally
2. ⚠️ Configure Firebase (optional)
3. ⚠️ Configure Cloudinary (optional)
4. 🚀 Deploy to production
5. 📱 Generate APK
6. 🎉 Launch!

**Happy coding! 🚀**
