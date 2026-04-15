# VEXA Final Deployment Checklist (No Mistakes)

This guide is safe to commit. It does not contain private credentials.

## Phase 1: Push Latest Code

1. Open terminal in project root.
2. Confirm sensitive files are ignored:
   - vexa-backend.env
   - DEPLOY_WITH_CREDENTIALS.md
   - VEXA-latest.apk
3. Commit and push code changes:

   git add .
   git commit -m "feat: admin panel backend, integration updates, deploy runbook"
   git push origin main

## Phase 2: Backend Deploy on Render (Use Existing Service)

Use your existing service only: vexa-backend.
Do not create a new backend service.

1. Render -> vexa-backend -> Settings:
   - Root Directory: vexa-backend
   - Build Command: npm install && npx prisma generate && npx prisma migrate deploy
   - Start Command: npm start
2. Render -> Environment:
   - Keep your existing production values from local private env file.
   - Ensure these keys exist:
     - BETTER_AUTH_URL = https://vexa-backend-hx9v.onrender.com
     - ADMIN_JWT_SECRET = <strong random value>
     - ADMIN_JWT_REFRESH_SECRET = <strong random value>
     - CORS_ALLOWED_ORIGINS = http://localhost:3001,http://127.0.0.1:3001
     - PASSWORD_RESET_URL = https://vexa-backend-hx9v.onrender.com
3. Trigger deploy (manual deploy latest commit if needed).

## Phase 3: Verify Backend After Deploy

Run checks:

curl -sS https://vexa-backend-hx9v.onrender.com/api/health
curl -sS https://vexa-backend-hx9v.onrender.com/api/admin/health

Expected:
- health returns ok
- admin health returns success (not 404)

## Phase 4: Create Production Super Admin (One Time)

From project root run:

cd vexa-backend
ADMIN_EMAIL=superadmin@vexa.app ADMIN_PASSWORD='Admin@12345' ADMIN_NAME='VEXA Super Admin' npx tsx --env-file=../vexa-backend.env scripts/create-super-admin.ts

## Phase 5: Deploy Admin on Vercel

1. Create/import project from folder vexa-admin.
2. Add environment variable in Vercel:
   - NEXT_PUBLIC_API_BASE_URL = https://vexa-backend-hx9v.onrender.com/api
3. Deploy and copy final admin URL.

## Phase 6: Connect Admin Domain to Backend CORS

In Render environment, update:

CORS_ALLOWED_ORIGINS=https://<your-admin-domain>,http://localhost:3001,http://127.0.0.1:3001

Redeploy backend once more.

## Phase 7: Test End-to-End

1. Admin login works on Vercel URL.
2. Admin dashboard loads analytics.
3. Mobile app login and job flow still works.
4. Uploads and notifications still work.

## If Something Fails

1. Check Render deploy logs first.
2. Check backend endpoints again.
3. Roll back to previous successful Render deploy if needed.
4. Fix and redeploy.

## Safety Rules

1. Never commit private env files.
2. Never commit credential documents.
3. Keep backend on Render, admin on Vercel.
4. Add Vercel admin domain to CORS every time domain changes.
