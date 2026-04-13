-- Sync schema columns that exist in prisma/schema.prisma but were missing in earlier SQL migrations.

-- users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "kycDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "deviceTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- service_requests
ALTER TABLE "service_requests"
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "urgency" TEXT NOT NULL DEFAULT 'NORMAL';

-- payments
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'RAZORPAY';
