# VEXA Platform

VEXA is a production-focused service marketplace platform with a React Native mobile app, TypeScript backend APIs, admin operations panel, and an APK distribution website.

The stack is designed around one goal: real-time customer-provider service execution with reliable payments, moderation, and release delivery.

## Product Overview

VEXA supports three actors end-to-end:

- Customers: create service requests, compare live bids, manage payments, rate providers.
- Providers: discover jobs, submit bids, complete work, handle revisions, track earnings.
- Admins: supervise platform activity, moderate users/content, monitor risk and integrity.

## Repository Map

| Path | Purpose |
|------|---------|
| [vexa](vexa) | React Native Android app (TypeScript, Zustand, NativeWind) |
| [vexa-backend](vexa-backend) | Express 5 API, Prisma/PostgreSQL, auth, jobs, bids, payments |
| [vexa-admin](vexa-admin) | Next.js admin control center |
| [vexa-download-site](vexa-download-site) | Public APK landing page synced to latest GitHub release |
| [.github/workflows/android-release.yml](.github/workflows/android-release.yml) | Android release automation pipeline |

## Feature Coverage

### Mobile User Features

- Email/password and social auth support.
- Role-aware flows for customer and provider journeys.
- Job posting, bid submission, and live status updates.
- Job revision/modification requests with approval workflow.
- In-app notifications and activity tracking.
- KYC and profile completion flows.

### Platform/Backend Features

- Express + Prisma API architecture with typed models.
- Real-time updates via Socket.io.
- Payment order and verification workflows.
- Upload support with Cloudinary/local fallback paths.
- Admin domain endpoints for moderation and analytics.
- Database migration support through Prisma migrations.

### Distribution Features

- Release APK generation workflow for tagged versions.
- GitHub Release asset publishing and checksum artifacts.
- Branded download page that fetches the latest release automatically.

## Architecture Snapshot

- Mobile app consumes REST endpoints and Socket.io events.
- Backend writes to PostgreSQL through Prisma.
- Admin panel consumes backend admin endpoints.
- Download site reads release metadata from GitHub API.

## Tech Stack

| Layer | Technology |
|------|------------|
| Mobile | React Native 0.84, TypeScript, Zustand, NativeWind |
| Backend | Node.js, Express 5, Prisma, PostgreSQL |
| Real-time | Socket.io |
| Admin | Next.js App Router, TypeScript, Tailwind |
| Build/Release | Gradle, GitHub Actions, GitHub Releases |
| Distribution | GitHub Pages + Vercel |

## Prerequisites

- Node.js 22+
- npm 10+
- Java 17+
- Android SDK and build tools
- PostgreSQL 14+

## Local Development

### 1) Install Dependencies

Backend:

```bash
cd vexa-backend
npm install
```

Mobile:

```bash
cd vexa
npm install
```

Admin:

```bash
cd vexa-admin
npm install
```

### 2) Configure Environment

Use template values from:

- [vexa-backend/.env.example](vexa-backend/.env.example)

Do not commit real credentials.

### 3) Prepare Database

```bash
cd vexa-backend
npx prisma migrate dev
npx prisma generate
```

### 4) Run Services

Backend:

```bash
cd vexa-backend
npm run dev
```

Mobile Metro:

```bash
cd vexa
npm start
```

Run Android app:

```bash
cd vexa
npm run android
```

Run admin panel:

```bash
cd vexa-admin
npm run dev
```

## Android Build and Release

Build release APK locally:

```bash
cd vexa/android
./gradlew assembleRelease
```

APK output:

- [vexa/android/app/build/outputs/apk/release/app-release.apk](vexa/android/app/build/outputs/apk/release/app-release.apk)

Automated release workflow:

- [.github/workflows/android-release.yml](.github/workflows/android-release.yml)

## Live Distribution Endpoints

- GitHub Releases: https://github.com/mohammadshafishaik/vexa-mobile-app/releases
- GitHub Pages download site: https://mohammadshafishaik.github.io/vexa-mobile-app/
- Vercel download site alias: https://vexa-download-site.vercel.app

Release API used by website:

- https://api.github.com/repos/mohammadshafishaik/vexa-mobile-app/releases/latest

## Security Practices

- Keep only placeholder values in committed docs.
- Never commit `.env` files with real secrets.
- Rotate credentials immediately after any exposure.
- Prefer platform secret managers for production deployment.

## Key Documentation

- [QUICK_START.md](QUICK_START.md)
- [SETUP_GUIDE.md](SETUP_GUIDE.md)
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

## Contributing Flow

1. Create feature branch from `main`.
2. Keep commits scoped and testable.
3. Open PR with clear verification notes.
4. Merge only after checks and review pass.

## License

Proprietary and confidential unless explicitly stated otherwise.