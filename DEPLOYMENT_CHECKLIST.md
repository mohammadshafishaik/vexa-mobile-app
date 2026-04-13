# VEXA Production Deployment Checklist

Use this checklist to ensure everything is configured correctly before deploying to production.

## 📋 Pre-Deployment Checklist

### Backend Setup

- [ ] **Dependencies Installed**
  ```bash
  cd vexa-backend && npm install
  ```

- [ ] **Database Created**
  ```bash
  createdb vexa_db
  ```

- [ ] **Migrations Run**
  ```bash
  npx prisma migrate dev
  npx prisma generate
  ```

- [ ] **Environment Variables Configured**
  - [ ] `DATABASE_URL` - PostgreSQL connection string
  - [ ] `JWT_SECRET` - Strong random string
  - [ ] `JWT_REFRESH_SECRET` - Strong random string
  - [ ] `BETTER_AUTH_SECRET` - Strong random string
  - [ ] `BETTER_AUTH_URL` - Backend URL
  - [ ] `PORT` - Server port (default: 3000)

- [ ] **Payment Gateway Configured**
  - [ ] `RAZORPAY_KEY_ID` - Razorpay key
  - [ ] `RAZORPAY_KEY_SECRET` - Razorpay secret
  - [ ] Test payment flow works

- [ ] **Backend Starts Successfully**
  ```bash
  npm run dev
  ```
  - [ ] No errors in console
  - [ ] Health check works: `http://localhost:3000/api/health`

### Frontend Setup

- [ ] **Dependencies Installed**
  ```bash
  cd vexa && npm install
  ```

- [ ] **API URL Configured**
  - [ ] Development: `http://10.0.2.2:3000/api` (Android) or `http://localhost:3000/api` (iOS)
  - [ ] Production: Update to deployed backend URL

- [ ] **App Builds Successfully**
  ```bash
  npm run android
  ```
  - [ ] No build errors
  - [ ] App launches on emulator/device

### Optional Features

- [ ] **Google Sign-In (Optional)**
  - [ ] Firebase project created
  - [ ] Android app added to Firebase
  - [ ] `google-services.json` downloaded and placed in `vexa/android/app/`
  - [ ] SHA-1 fingerprint added to Firebase
  - [ ] OAuth credentials configured
  - [ ] `GOOGLE_CLIENT_ID` in backend .env
  - [ ] `GOOGLE_CLIENT_SECRET` in backend .env
  - [ ] Google Sign-In tested

- [ ] **Push Notifications (Optional)**
  - [ ] Firebase Admin SDK configured
  - [ ] `FIREBASE_PROJECT_ID` in backend .env
  - [ ] `FIREBASE_PRIVATE_KEY` in backend .env
  - [ ] `FIREBASE_CLIENT_EMAIL` in backend .env
  - [ ] Device token registration tested
  - [ ] Push notification received on device

- [ ] **Cloudinary (Optional)**
  - [ ] Cloudinary account created
  - [ ] `CLOUDINARY_CLOUD_NAME` in backend .env
  - [ ] `CLOUDINARY_API_KEY` in backend .env
  - [ ] `CLOUDINARY_API_SECRET` in backend .env
  - [ ] Image upload tested

---

## 🧪 Testing Checklist

### Backend API Testing

- [ ] **Authentication**
  - [ ] User registration works
  - [ ] User login works
  - [ ] Token refresh works
  - [ ] Google Sign-In works (if configured)

- [ ] **Jobs**
  - [ ] Create job works
  - [ ] List jobs works (customer view)
  - [ ] List jobs works (provider view)
  - [ ] Get job details works
  - [ ] Update job status works

- [ ] **Bidding**
  - [ ] Submit bid works
  - [ ] Get job bids works
  - [ ] Accept bid works
  - [ ] Real-time bid updates work

- [ ] **Modifications**
  - [ ] Request modification works
  - [ ] Approve modification works
  - [ ] Reject modification works
  - [ ] Real-time modification updates work

- [ ] **Payments**
  - [ ] Create Razorpay order works
  - [ ] Payment verification works
  - [ ] Cash payment works
  - [ ] Payment history works

- [ ] **File Upload**
  - [ ] Single image upload works
  - [ ] Multiple image upload works
  - [ ] Images accessible via URL

- [ ] **Notifications**
  - [ ] In-app notifications work
  - [ ] Push notifications work (if configured)
  - [ ] Mark as read works

- [ ] **User Profile**
  - [ ] Get profile works
  - [ ] Update profile works
  - [ ] KYC submission works
  - [ ] Device token registration works

### Frontend Testing

- [ ] **Authentication Flow**
  - [ ] Registration screen works
  - [ ] Login screen works
  - [ ] Logout works
  - [ ] Token refresh automatic

- [ ] **Customer Flow**
  - [ ] Post job with images
  - [ ] View posted jobs
  - [ ] View bids on job
  - [ ] Accept bid
  - [ ] Approve/reject modification
  - [ ] Make payment
  - [ ] Rate provider

- [ ] **Provider Flow**
  - [ ] Browse available jobs
  - [ ] Submit bid
  - [ ] View accepted jobs
  - [ ] Request modification
  - [ ] Mark job complete
  - [ ] View earnings

- [ ] **Real-Time Features**
  - [ ] New bid notification appears
  - [ ] Job status updates in real-time
  - [ ] Modification requests appear instantly
  - [ ] Payment notifications work

- [ ] **UI/UX**
  - [ ] All screens render correctly
  - [ ] Navigation works smoothly
  - [ ] Loading states show properly
  - [ ] Error messages display correctly
  - [ ] Images load properly

---

## 🚀 Production Deployment

### Backend Deployment (Render.com)

- [ ] **Render Account Setup**
  - [ ] Account created
  - [ ] GitHub repository connected

- [ ] **PostgreSQL Database**
  - [ ] Database created on Render
  - [ ] Internal database URL copied
  - [ ] Database accessible

- [ ] **Web Service**
  - [ ] Web service created
  - [ ] Repository connected
  - [ ] Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
  - [ ] Start command: `npm start`
  - [ ] Environment variables added:
    - [ ] `DATABASE_URL`
    - [ ] `JWT_SECRET`
    - [ ] `JWT_REFRESH_SECRET`
    - [ ] `BETTER_AUTH_SECRET`
    - [ ] `BETTER_AUTH_URL` (production URL)
    - [ ] `RAZORPAY_KEY_ID`
    - [ ] `RAZORPAY_KEY_SECRET`
    - [ ] `GOOGLE_CLIENT_ID` (if using)
    - [ ] `GOOGLE_CLIENT_SECRET` (if using)
    - [ ] `CLOUDINARY_CLOUD_NAME` (if using)
    - [ ] `CLOUDINARY_API_KEY` (if using)
    - [ ] `CLOUDINARY_API_SECRET` (if using)
    - [ ] `FIREBASE_PROJECT_ID` (if using)
    - [ ] `FIREBASE_PRIVATE_KEY` (if using)
    - [ ] `FIREBASE_CLIENT_EMAIL` (if using)

- [ ] **Deployment**
  - [ ] Service deployed successfully
  - [ ] No errors in logs
  - [ ] Health check works: `https://your-backend.onrender.com/api/health`

### Frontend Production Build

- [ ] **Update API URL**
  - [ ] Changed in `vexa/src/services/api.ts`
  - [ ] Points to production backend URL
  - [ ] Tested connection

- [ ] **Generate Signing Key**
  ```bash
  cd vexa/android/app
  keytool -genkeypair -v -storetype PKCS12 -keystore vexa-release-key.keystore -alias vexa-key-alias -keyalg RSA -keysize 2048 -validity 10000
  ```
  - [ ] Keystore created
  - [ ] Password saved securely

- [ ] **Configure Gradle**
  - [ ] `gradle.properties` updated with keystore info
  - [ ] `build.gradle` configured for release signing

- [ ] **Build Release APK**
  ```bash
  cd vexa/android
  ./gradlew assembleRelease
  ```
  - [ ] Build successful
  - [ ] APK generated at `app/build/outputs/apk/release/app-release.apk`

- [ ] **Test APK**
  - [ ] Installed on physical device
  - [ ] App launches successfully
  - [ ] All features work
  - [ ] No crashes

---

## 🔒 Security Checklist

- [ ] **Environment Variables**
  - [ ] No secrets in code
  - [ ] `.env` files in `.gitignore`
  - [ ] Strong random secrets generated

- [ ] **API Security**
  - [ ] CORS configured properly
  - [ ] Helmet.js enabled
  - [ ] JWT tokens expire appropriately
  - [ ] Refresh tokens implemented

- [ ] **Payment Security**
  - [ ] Razorpay signature verification working
  - [ ] Payment amounts validated server-side
  - [ ] No payment logic in frontend

- [ ] **File Upload Security**
  - [ ] File type validation
  - [ ] File size limits enforced
  - [ ] Uploaded files scanned (if applicable)

- [ ] **Database Security**
  - [ ] Prisma prevents SQL injection
  - [ ] Database credentials secure
  - [ ] Database backups configured

---

## 📊 Monitoring & Maintenance

- [ ] **Logging**
  - [ ] Backend logs accessible
  - [ ] Error tracking setup (optional: Sentry)
  - [ ] Performance monitoring (optional)

- [ ] **Database**
  - [ ] Backup strategy in place
  - [ ] Migration rollback plan
  - [ ] Database monitoring

- [ ] **Uptime Monitoring**
  - [ ] Health check endpoint monitored
  - [ ] Alerts configured for downtime

- [ ] **Performance**
  - [ ] API response times acceptable
  - [ ] Database queries optimized
  - [ ] Image loading optimized

---

## 📱 App Store Preparation (Future)

- [ ] **App Assets**
  - [ ] App icon (1024x1024)
  - [ ] Screenshots (various sizes)
  - [ ] Feature graphic
  - [ ] App description

- [ ] **Google Play Console**
  - [ ] Developer account created
  - [ ] App listing created
  - [ ] Privacy policy URL
  - [ ] Terms of service URL

- [ ] **App Bundle**
  - [ ] Generate signed AAB
  - [ ] Upload to Play Console
  - [ ] Internal testing
  - [ ] Beta testing
  - [ ] Production release

---

## ✅ Final Verification

- [ ] **End-to-End Testing**
  - [ ] Complete customer journey tested
  - [ ] Complete provider journey tested
  - [ ] Payment flow tested with real card
  - [ ] All notifications working

- [ ] **Performance Testing**
  - [ ] App loads quickly
  - [ ] No memory leaks
  - [ ] Smooth animations
  - [ ] Responsive UI

- [ ] **Device Testing**
  - [ ] Tested on multiple Android versions
  - [ ] Tested on different screen sizes
  - [ ] Tested on low-end devices
  - [ ] Tested on slow network

- [ ] **Documentation**
  - [ ] README.md updated
  - [ ] API documentation complete
  - [ ] User guide created (optional)
  - [ ] Admin guide created (optional)

---

## 🎉 Launch Day

- [ ] **Pre-Launch**
  - [ ] All checklist items completed
  - [ ] Team briefed
  - [ ] Support channels ready
  - [ ] Monitoring active

- [ ] **Launch**
  - [ ] Backend deployed
  - [ ] APK distributed
  - [ ] Announcement made
  - [ ] Social media updated

- [ ] **Post-Launch**
  - [ ] Monitor logs for errors
  - [ ] Monitor user feedback
  - [ ] Quick response to issues
  - [ ] Celebrate! 🎊

---

## 📞 Support Contacts

- **Backend Issues:** Check Render.com logs
- **Database Issues:** Check Render.com database logs
- **Payment Issues:** Check Razorpay dashboard
- **Firebase Issues:** Check Firebase console
- **Cloudinary Issues:** Check Cloudinary dashboard

---

## 🔄 Rollback Plan

If something goes wrong:

1. **Backend Issues:**
   - Revert to previous deployment on Render
   - Check environment variables
   - Review recent code changes

2. **Database Issues:**
   - Restore from backup
   - Rollback migration if needed

3. **Frontend Issues:**
   - Distribute previous APK version
   - Fix and rebuild

---

**Remember:** Test thoroughly before deploying to production!

Good luck with your launch! 🚀
