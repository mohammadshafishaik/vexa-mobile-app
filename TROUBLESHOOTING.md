# 🔧 VEXA Troubleshooting Guide

Common issues and their solutions.

---

## 🗄️ Database Issues

### Issue: "Cannot connect to database"

**Symptoms:**
```
Error: P1001: Can't reach database server
```

**Solutions:**

1. **Check if PostgreSQL is running:**
   ```bash
   # macOS
   brew services list
   brew services start postgresql
   
   # Ubuntu
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   ```

2. **Check if database exists:**
   ```bash
   psql -l | grep vexa_db
   
   # If not found, create it:
   createdb vexa_db
   ```

3. **Verify DATABASE_URL in .env:**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/vexa_db?schema=public"
   ```

4. **Test connection:**
   ```bash
   psql -d vexa_db
   ```

### Issue: "Migration failed"

**Symptoms:**
```
Error: Migration failed to apply
```

**Solutions:**

1. **Reset database (WARNING: Deletes all data):**
   ```bash
   cd vexa-backend
   npx prisma migrate reset
   ```

2. **Apply migrations manually:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

### Issue: "Prisma Client not found"

**Symptoms:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
```bash
cd vexa-backend
npx prisma generate
npm run dev
```

---

## 🔌 Backend Issues

### Issue: "Port 3000 already in use"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. **Find and kill the process:**
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Or find the PID
   lsof -i:3000
   kill -9 <PID>
   ```

2. **Change port in .env:**
   ```env
   PORT=3001
   ```

### Issue: "Module not found"

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
cd vexa-backend
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Environment variables not loading"

**Symptoms:**
- `undefined` values for process.env variables
- Authentication errors

**Solutions:**

1. **Check .env file exists:**
   ```bash
   ls -la vexa-backend/.env
   ```

2. **Verify .env format:**
   ```env
   # No spaces around =
   DATABASE_URL="postgresql://..."
   JWT_SECRET="your-secret"
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

### Issue: "Cloudinary upload fails"

**Symptoms:**
```
Error: Invalid cloud_name
```

**Solutions:**

1. **Check Cloudinary credentials in .env:**
   ```env
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   ```

2. **Verify credentials in Cloudinary dashboard**

3. **Fallback to local storage:**
   - Remove Cloudinary env vars
   - Images will be stored in `uploads/` folder

### Issue: "Firebase push notifications not working"

**Symptoms:**
- No push notifications received
- Firebase initialization error

**Solutions:**

1. **Check Firebase credentials in .env:**
   ```env
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
   ```

2. **Ensure private key has \n for newlines:**
   ```bash
   # In .env file, the key should look like:
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----"
   ```

3. **Verify device token is registered:**
   ```bash
   curl -X POST http://localhost:3000/api/users/device-token \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"deviceToken": "your_fcm_token"}'
   ```

---

## 📱 Frontend Issues

### Issue: "Cannot connect to backend"

**Symptoms:**
```
Network Error
Error: connect ECONNREFUSED
```

**Solutions:**

1. **Check backend is running:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Verify API URL in `vexa/src/services/api.ts`:**
   ```typescript
   // For Android emulator
   const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
   const BASE_URL = `http://${HOST}:3000/api`;
   ```

3. **Check network permissions in AndroidManifest.xml:**
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```

4. **Clear Metro cache:**
   ```bash
   cd vexa
   npm start -- --reset-cache
   ```

### Issue: "Module not found" (Frontend)

**Symptoms:**
```
Error: Unable to resolve module 'react-native-gesture-handler'
```

**Solutions:**

1. **Install dependencies:**
   ```bash
   cd vexa
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Link native modules:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

3. **Clear cache:**
   ```bash
   npm start -- --reset-cache
   ```

### Issue: "Build failed" (Android)

**Symptoms:**
```
FAILURE: Build failed with an exception
```

**Solutions:**

1. **Clean build:**
   ```bash
   cd vexa/android
   ./gradlew clean
   cd ..
   npm run android
   ```

2. **Check Java version:**
   ```bash
   java -version
   # Should be Java 17 or higher
   ```

3. **Check Android SDK:**
   ```bash
   # Ensure Android SDK is installed
   # Check in Android Studio > SDK Manager
   ```

4. **Clear Gradle cache:**
   ```bash
   cd vexa/android
   rm -rf .gradle
   ./gradlew clean
   ```

### Issue: "Google Sign-In not working"

**Symptoms:**
- Sign-in button does nothing
- Error: "Developer Error"

**Solutions:**

1. **Check google-services.json exists:**
   ```bash
   ls vexa/android/app/google-services.json
   ```

2. **Verify SHA-1 fingerprint:**
   ```bash
   cd vexa/android
   ./gradlew signingReport
   # Copy SHA-1 and add to Firebase Console
   ```

3. **Check package name matches:**
   - Firebase Console: `com.vexa.app`
   - `android/app/build.gradle`: `applicationId "com.vexa.app"`

4. **Rebuild app:**
   ```bash
   cd vexa/android
   ./gradlew clean
   cd ..
   npm run android
   ```

### Issue: "Images not uploading"

**Symptoms:**
- Image picker works but upload fails
- Network error on upload

**Solutions:**

1. **Check permissions in AndroidManifest.xml:**
   ```xml
   <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
   <uses-permission android:name="android.permission.CAMERA" />
   ```

2. **Request runtime permissions:**
   ```typescript
   import { PermissionsAndroid } from 'react-native';
   
   const granted = await PermissionsAndroid.request(
     PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
   );
   ```

3. **Check backend upload endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -H "Authorization: Bearer <token>" \
     -F "image=@test.jpg"
   ```

### Issue: "Push notifications not received"

**Symptoms:**
- No notifications on device
- Notifications work in-app only

**Solutions:**

1. **Check Firebase setup:**
   - `google-services.json` in `android/app/`
   - Firebase Cloud Messaging enabled

2. **Request notification permission:**
   ```typescript
   import messaging from '@react-native-firebase/messaging';
   
   const authStatus = await messaging().requestPermission();
   ```

3. **Register device token:**
   ```typescript
   const fcmToken = await messaging().getToken();
   await userService.registerDeviceToken(fcmToken);
   ```

4. **Test from Firebase Console:**
   - Go to Cloud Messaging
   - Send test notification
   - Use your FCM token

---

## 💳 Payment Issues

### Issue: "Payment verification fails"

**Symptoms:**
```
Error: Payment verification failed — signature mismatch
```

**Solutions:**

1. **Check Razorpay keys match:**
   - Backend .env: `RAZORPAY_KEY_SECRET`
   - Frontend: Uses `RAZORPAY_KEY_ID` from backend response

2. **Verify signature calculation:**
   ```javascript
   // Backend should calculate:
   const expectedSignature = crypto
     .createHmac('sha256', RAZORPAY_KEY_SECRET)
     .update(`${orderId}|${paymentId}`)
     .digest('hex');
   ```

3. **Use Razorpay test cards:**
   - Success: 4111 1111 1111 1111
   - Failure: 4000 0000 0000 0002

### Issue: "Razorpay order creation fails"

**Symptoms:**
```
Error: Invalid key_id
```

**Solutions:**

1. **Verify Razorpay credentials:**
   ```bash
   # Check in Razorpay Dashboard > Settings > API Keys
   ```

2. **Check environment:**
   - Test mode: `rzp_test_...`
   - Live mode: `rzp_live_...`

3. **Restart backend after updating .env:**
   ```bash
   npm run dev
   ```

---

## 🔄 Real-Time Issues

### Issue: "Socket.io not connecting"

**Symptoms:**
- No real-time updates
- Bids don't appear instantly

**Solutions:**

1. **Check Socket.io server is running:**
   ```bash
   # Backend logs should show:
   # 📡 Socket.io ready for real-time events
   ```

2. **Verify frontend Socket.io connection:**
   ```typescript
   import { socketService } from './services/socket';
   
   socketService.connect();
   socketService.on('connect', () => {
     console.log('Connected to Socket.io');
   });
   ```

3. **Check CORS settings:**
   ```typescript
   // Backend index.ts
   const io = new SocketServer(server, {
     cors: { origin: '*', methods: ['GET', 'POST'] },
   });
   ```

### Issue: "Real-time events not received"

**Symptoms:**
- Connected to Socket.io but no events

**Solutions:**

1. **Join appropriate rooms:**
   ```typescript
   // Join user room
   socketService.emit('user:join', userId);
   
   // Join bidding room
   socketService.emit('bidding:join', jobId);
   ```

2. **Listen for events:**
   ```typescript
   socketService.on('bid:new', (data) => {
     console.log('New bid:', data);
   });
   ```

3. **Check backend emits events:**
   ```typescript
   // Backend should emit:
   io.to(`bidding:${jobId}`).emit('bid:new', bid);
   ```

---

## 🚀 Deployment Issues

### Issue: "Render.com deployment fails"

**Symptoms:**
- Build fails on Render
- Service won't start

**Solutions:**

1. **Check build command:**
   ```
   npm install && npx prisma generate && npx prisma migrate deploy
   ```

2. **Check start command:**
   ```
   npm start
   ```

3. **Verify environment variables:**
   - All required vars set in Render dashboard
   - DATABASE_URL points to Render PostgreSQL

4. **Check logs:**
   - Go to Render dashboard
   - Click on service
   - View logs for errors

### Issue: "Database migration fails on Render"

**Symptoms:**
```
Error: Migration failed
```

**Solutions:**

1. **Use migrate deploy instead of migrate dev:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Check DATABASE_URL:**
   - Should be Internal Database URL from Render
   - Format: `postgresql://user:pass@host/db`

3. **Run migrations manually:**
   ```bash
   # Connect to Render shell
   npx prisma migrate deploy
   ```

---

## 🔍 Debugging Tips

### Enable Verbose Logging

**Backend:**
```typescript
// Add to index.ts
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

**Frontend:**
```typescript
// Add to api.ts
api.interceptors.request.use((config) => {
  console.log('Request:', config.method, config.url);
  return config;
});
```

### Check Network Requests

**React Native Debugger:**
```bash
# Install
brew install --cask react-native-debugger

# Open
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

**Chrome DevTools:**
```
1. Shake device
2. Select "Debug"
3. Open Chrome: chrome://inspect
```

### Database Inspection

```bash
cd vexa-backend
npx prisma studio
# Opens at http://localhost:5555
```

### Check Logs

**Backend:**
```bash
# Terminal running npm run dev
# All console.log and errors appear here
```

**Frontend:**
```bash
# React Native logs
npx react-native log-android

# Or in Metro bundler terminal
```

---

## 📞 Getting Help

### Before Asking for Help

1. ✅ Check this troubleshooting guide
2. ✅ Check error messages carefully
3. ✅ Search error on Google/Stack Overflow
4. ✅ Check relevant documentation
5. ✅ Try restarting services

### When Asking for Help

Include:
- Error message (full text)
- What you were trying to do
- What you've already tried
- Your environment (OS, Node version, etc.)
- Relevant code snippets

### Useful Commands

```bash
# Check versions
node -v
npm -v
java -version
psql --version

# Check running processes
lsof -i:3000
ps aux | grep node

# Check disk space
df -h

# Check memory
free -h  # Linux
vm_stat  # macOS
```

---

## 🆘 Emergency Fixes

### Nuclear Option: Complete Reset

**WARNING: This deletes all data!**

```bash
# Backend
cd vexa-backend
rm -rf node_modules package-lock.json
npm install
npx prisma migrate reset
npx prisma generate
npm run prisma:seed

# Frontend
cd vexa
rm -rf node_modules package-lock.json
npm install
cd android
./gradlew clean
cd ..
npm start -- --reset-cache
npm run android
```

### Quick Health Check

```bash
# Backend health
curl http://localhost:3000/api/health

# Database connection
psql -d vexa_db -c "SELECT 1"

# Frontend build
cd vexa/android && ./gradlew assembleDebug
```

---

**Still stuck? Check the documentation files or search for your specific error message online.**
