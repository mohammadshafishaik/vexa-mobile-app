# VEXA - Real-Time Service Marketplace

A production-ready React Native mobile application connecting customers with service providers through real-time bidding, secure payments, and live updates.

## 🎯 Overview

VEXA is a comprehensive service marketplace platform that enables:
- **Customers** to post service requests and receive competitive bids
- **Providers** to browse jobs and submit proposals
- **Real-time bidding** with Socket.io
- **Secure payments** via Razorpay
- **Job modifications** with approval workflow
- **Push notifications** via Firebase
- **Image uploads** with Cloudinary
- **Location-based** services with GPS

## 🚀 Quick Start

### Prerequisites

- Node.js >= 22.11.0
- PostgreSQL >= 14
- Android Studio (for Android development)
- Java JDK 17+

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd vexa

# 2. Install backend dependencies
cd vexa-backend
npm install

# 3. Setup database
createdb vexa_db
npx prisma migrate dev
npx prisma generate

# 4. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 5. Start backend
npm run dev

# 6. Install frontend dependencies (new terminal)
cd ../vexa
npm install

# 7. Start Metro bundler
npm start

# 8. Run on Android (new terminal)
npm run android
```

**See [QUICK_START.md](./QUICK_START.md) for detailed instructions.**

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICK_START.md](./QUICK_START.md) | Get up and running in 5 minutes |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Complete setup for Firebase, Cloudinary, deployment |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | All implemented features and status |
| [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md) | Code examples for frontend integration |
| [VEXA_SRS.md](./VEXA_SRS.md) | Software Requirements Specification |

## ✨ Features

### Phase 1: Core Features ✅
- ✅ User authentication (email/password + Google Sign-In)
- ✅ Job posting with multiple images
- ✅ Real-time bidding system
- ✅ Job modification workflow
- ✅ Secure payment processing (Razorpay)
- ✅ Ratings and reviews
- ✅ Dispute management
- ✅ Real-time notifications

### Phase 2: Enhancements ✅
- ✅ Push notifications (Firebase Cloud Messaging)
- ✅ Image uploads (Cloudinary + local fallback)
- ✅ Location & GPS integration
- ✅ Job scheduling with date/time picker
- ✅ Provider profiles with KYC verification
- ✅ Device token management
- ✅ Skeleton loaders (implementation guide)

### Phase 3: Production Ready ✅
- ✅ Backend deployment configuration (Render.com)
- ✅ APK generation setup
- ✅ Environment configuration
- ✅ Security best practices
- ✅ Error handling
- ✅ Logging and monitoring

## 🏗️ Architecture

### Backend (Node.js + Express)
```
vexa-backend/
├── src/
│   ├── routes/          # API endpoints
│   ├── lib/             # Core libraries (Prisma, Socket.io, Firebase)
│   ├── middleware/      # Auth, validation
│   ├── utils/           # Helper functions
│   └── index.ts         # Server entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
└── uploads/             # Local file storage
```

### Frontend (React Native)
```
vexa/
├── src/
│   ├── screens/         # App screens
│   ├── components/      # Reusable components
│   ├── services/        # API services
│   ├── store/           # Zustand state management
│   ├── navigation/      # React Navigation
│   ├── theme/           # Styling
│   └── types/           # TypeScript types
└── android/             # Android native code
```

## 🔧 Technology Stack

### Backend
- **Runtime:** Node.js 22+
- **Framework:** Express 5
- **Database:** PostgreSQL with Prisma ORM
- **Real-time:** Socket.io
- **Authentication:** Better Auth + JWT
- **Payments:** Razorpay
- **File Upload:** Multer + Cloudinary
- **Push Notifications:** Firebase Admin SDK

### Frontend
- **Framework:** React Native 0.84
- **Language:** TypeScript
- **State Management:** Zustand
- **Navigation:** React Navigation
- **Styling:** NativeWind (Tailwind CSS)
- **Animations:** React Native Reanimated
- **Icons:** Lucide React Native
- **HTTP Client:** Axios
- **Real-time:** Socket.io Client

## 🔐 Security Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Password hashing with bcryptjs
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Razorpay signature verification
- ✅ Input validation
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection
- ✅ Rate limiting ready

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - List jobs (role-aware)
- `POST /api/jobs` - Create job
- `GET /api/jobs/:id` - Get job details
- `PATCH /api/jobs/:id/status` - Update job status
- `PATCH /api/jobs/:id/complete` - Mark job complete
- `PATCH /api/jobs/:id/accept-work` - Accept completed work

### Bids
- `POST /api/bids` - Submit bid
- `GET /api/bids/job/:jobId` - Get job bids
- `POST /api/bids/:id/accept` - Accept bid

### Modifications
- `POST /api/modifications` - Request modification
- `PATCH /api/modifications/:id` - Approve/reject modification

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/cash` - Record cash payment
- `GET /api/payments/history` - Payment history

### Users
- `POST /api/users/device-token` - Register device token
- `DELETE /api/users/device-token` - Remove device token
- `POST /api/users/kyc` - Submit KYC documents
- `GET /api/users/profile/:userId` - Get user profile
- `PATCH /api/users/profile` - Update profile

### Upload
- `POST /api/upload` - Upload single image
- `POST /api/upload/multiple` - Upload multiple images

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/read` - Mark as read

### Ratings
- `POST /api/ratings` - Submit rating
- `GET /api/ratings/user/:userId` - Get user ratings

### Disputes
- `POST /api/disputes` - Raise dispute
- `GET /api/disputes` - List disputes
- `PATCH /api/disputes/:id` - Update dispute

## 🔄 Real-Time Events (Socket.io)

### Client → Server
- `user:join` - Join user-specific room
- `bidding:join` - Join job bidding room
- `bidding:leave` - Leave job bidding room

### Server → Client
- `job:new` - New job posted
- `job:statusChange` - Job status updated
- `bid:new` - New bid received
- `job:bidUpdate` - Bid updated
- `modification:requested` - Modification requested
- `modification:updated` - Modification approved/rejected
- `notification:new` - New notification
- `payment:completed` - Payment completed

## 🗄️ Database Schema

### Core Models
- **User** - Customer/Provider accounts with KYC
- **ServiceRequest** - Job postings with location & scheduling
- **Bid** - Provider proposals
- **JobModification** - Price/scope change requests
- **Payment** - Transaction records
- **Rating** - Reviews and ratings
- **Dispute** - Conflict resolution
- **Notification** - In-app notifications
- **AuditLog** - Activity tracking

See [prisma/schema.prisma](./vexa-backend/prisma/schema.prisma) for complete schema.

## 🧪 Testing

### Backend Testing
```bash
cd vexa-backend

# Test health endpoint
curl http://localhost:3000/api/health

# Test with Postman
# Import collection from routes/

# Database inspection
npx prisma studio
```

### Frontend Testing
```bash
cd vexa

# Run tests
npm test

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 🚀 Deployment

### Backend (Render.com)

1. Create PostgreSQL database
2. Create Web Service
3. Configure environment variables
4. Deploy

**See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.**

### Frontend (APK)

1. Generate signing key
2. Configure gradle
3. Build release APK
4. Test on device

```bash
cd vexa/android
./gradlew assembleRelease
```

APK location: `vexa/android/app/build/outputs/apk/release/app-release.apk`

## 🔑 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
RAZORPAY_KEY_ID="..."
RAZORPAY_KEY_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
FIREBASE_PROJECT_ID="..."
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL="..."
```

See [.env.example](./vexa-backend/.env.example) for complete list.

## 📊 Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend API | ✅ Complete | All endpoints implemented |
| Database | ✅ Complete | Schema with migrations |
| Authentication | ✅ Complete | Email + Google Sign-In |
| Real-time | ✅ Complete | Socket.io integrated |
| Payments | ✅ Complete | Razorpay with verification |
| File Upload | ✅ Complete | Cloudinary + local fallback |
| Push Notifications | ✅ Complete | Firebase FCM |
| Frontend Services | ✅ Complete | All API services ready |
| Documentation | ✅ Complete | Comprehensive guides |
| Deployment Config | ✅ Complete | Ready for production |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is proprietary and confidential.

## 🆘 Support

### Documentation
- [Quick Start Guide](./QUICK_START.md)
- [Setup Guide](./SETUP_GUIDE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Frontend Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md)

### Common Issues
See [QUICK_START.md](./QUICK_START.md) for troubleshooting.

### Contact
For support, please contact the development team.

## 🎉 Acknowledgments

- React Native community
- Prisma team
- Socket.io team
- Firebase team
- Cloudinary team
- Razorpay team

---

**Built with ❤️ for connecting service providers with customers**
