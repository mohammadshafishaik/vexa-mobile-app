# VEXA Mobile App Platform

VEXA is a full-stack service marketplace platform with:

- React Native Android app
- TypeScript/Express backend
- Admin dashboard
- Direct APK distribution through GitHub Releases and a branded download site

## What This Repository Contains

- [vexa](vexa): React Native mobile app
- [vexa-backend](vexa-backend): API, auth, jobs, bidding, payments, notifications
- [vexa-admin](vexa-admin): Admin dashboard
- [vexa-download-site](vexa-download-site): Public APK download website synced with latest GitHub release

## Core Product Features

- Customer and provider authentication
- Real-time bidding and status updates
- Job lifecycle management
- Payment integration with verification
- Cloudinary upload support
- Push notification support
- Admin analytics and moderation flows

## Quick Start

1. Install dependencies for backend and mobile app.
2. Configure backend environment variables using [vexa-backend/.env.example](vexa-backend/.env.example).
3. Run database migrations.
4. Start backend.
5. Start mobile app Metro server and launch Android build.

## Local Development Commands

Backend:

```bash
cd vexa-backend
npm install
npx prisma migrate dev
npm run dev
```

Mobile app:

```bash
cd vexa
npm install
npm start
npm run android
```

Admin dashboard:

```bash
cd vexa-admin
npm install
npm run dev
```

## Android Release Build

```bash
cd vexa/android
./gradlew assembleRelease
```

Release APK output:

- [vexa/android/app/build/outputs/apk/release/app-release.apk](vexa/android/app/build/outputs/apk/release/app-release.apk)

## Distribution

- GitHub release workflow: [.github/workflows/android-release.yml](.github/workflows/android-release.yml)
- Public download site: [vexa-download-site](vexa-download-site)
- Release feed endpoint used by site:
  - https://api.github.com/repos/mohammadshafishaik/vexa-mobile-app/releases/latest

## Security Notes

- Never commit real credentials in environment files.
- Keep only template values in committed env docs.
- Rotate all production credentials immediately if secrets were ever committed.

## Important Docs

- [QUICK_START.md](QUICK_START.md)
- [SETUP_GUIDE.md](SETUP_GUIDE.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)

## License

Proprietary. Internal use unless explicitly authorized.