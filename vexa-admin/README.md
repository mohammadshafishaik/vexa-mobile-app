# VEXA Admin Panel

Operational command center for VEXA marketplace governance.

This app is built for internal administrators to monitor platform health, moderate users, review KYC, and oversee marketplace integrity workflows.

## Stack

- Next.js App Router (TypeScript)
- Tailwind CSS v4
- Token-based admin authentication
- Backend integration with `/api/admin/*` endpoints

## Core Capabilities

- Admin login/session management
- Guarded routes and role-aware navigation
- Monitoring and moderation dashboards:
  - Overview analytics
  - User status and enforcement actions
  - KYC verification queue
  - Jobs operations monitor
  - Bidding anomaly monitor
  - Modification risk desk
  - Payments control desk and integrity scan
  - Disputes management
  - Ratings moderation
  - Notification campaigns
  - Audit log explorer
  - Admin user management

## Environment Configuration

Create `.env.local` and set:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

Production example:

```env
NEXT_PUBLIC_API_BASE_URL=https://vexa-backend-hx9v.onrender.com/api
```

## Local Development

```bash
cd vexa-admin
npm install
npm run dev
```

Default local URL:

- http://localhost:3001

## Quality Checks

```bash
cd vexa-admin
npm run lint
npm run build
```

## Deployment Notes

- Recommended host: Vercel.
- Ensure production backend URL is set in environment variables.
- After deployment, validate login + dashboard data loading + admin action endpoints.

## Operational Checklist

1. Confirm backend `/api/admin/health` is reachable.
2. Verify admin login and token refresh.
3. Validate one read-only analytics page.
4. Validate one write action (example: user status update).
5. Confirm CORS allows admin domain.
