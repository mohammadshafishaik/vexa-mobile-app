# VEXA Admin Panel

Production admin dashboard for VEXA marketplace operations.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Live integration with backend `/api/admin/*` routes

## Features Implemented

- Admin authentication: login, session hydration, logout
- Protected dashboard shell with role-aware navigation
- Pages:
	- Overview analytics
	- Users moderation
	- KYC verification queue
	- Jobs operations monitor
	- Bidding anomaly monitor
	- Modifications risk desk
	- Payments control desk + integrity scan
	- Disputes resolution desk
	- Ratings moderation
	- Notifications campaigns
	- Audit logs explorer
	- Admin user management

## Environment

Set API base URL if backend is not running on localhost:3000:

NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

## Run

npm install
npm run dev

## Build Validation

npm run lint
npm run build
