-- Admin panel foundation: roles, moderation, KYC workflow, anomaly tracking, dispute/payment action logs, admin sessions.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminRole') THEN
    CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'MODERATOR');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountStatus') THEN
    CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KycDocumentType') THEN
    CREATE TYPE "KycDocumentType" AS ENUM ('AADHAAR', 'PAN', 'OTHER');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KycDocumentStatus') THEN
    CREATE TYPE "KycDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BidAnomalyStatus') THEN
    CREATE TYPE "BidAnomalyStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BidAnomalyType') THEN
    CREATE TYPE "BidAnomalyType" AS ENUM ('RAPID_REBID', 'EXTREME_UNDERCUT', 'COLLUSION_PATTERN', 'OTHER');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeDecision') THEN
    CREATE TYPE "DisputeDecision" AS ENUM ('REFUND', 'PARTIAL_SETTLEMENT', 'REJECT');
  END IF;
END
$$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "adminRole" "AdminRole",
  ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "banReason" TEXT,
  ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bannedById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_bannedById_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_bannedById_fkey"
      FOREIGN KEY ("bannedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "kyc_documents" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentType" "KycDocumentType" NOT NULL,
  "fileKey" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "status" "KycDocumentStatus" NOT NULL DEFAULT 'PENDING',
  "remarks" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kyc_documents_userId_status_idx" ON "kyc_documents"("userId", "status");
CREATE INDEX IF NOT EXISTS "kyc_documents_status_createdAt_idx" ON "kyc_documents"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kyc_documents_userId_fkey'
  ) THEN
    ALTER TABLE "kyc_documents"
      ADD CONSTRAINT "kyc_documents_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kyc_documents_reviewedById_fkey'
  ) THEN
    ALTER TABLE "kyc_documents"
      ADD CONSTRAINT "kyc_documents_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "kyc_review_logs" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "remarks" TEXT,
  "previousState" JSONB,
  "newState" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kyc_review_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kyc_review_logs_documentId_createdAt_idx" ON "kyc_review_logs"("documentId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kyc_review_logs_documentId_fkey'
  ) THEN
    ALTER TABLE "kyc_review_logs"
      ADD CONSTRAINT "kyc_review_logs_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "kyc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kyc_review_logs_adminId_fkey'
  ) THEN
    ALTER TABLE "kyc_review_logs"
      ADD CONSTRAINT "kyc_review_logs_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "bid_anomalies" (
  "id" TEXT NOT NULL,
  "bidId" TEXT,
  "jobId" TEXT NOT NULL,
  "providerId" TEXT,
  "anomalyType" "BidAnomalyType" NOT NULL,
  "severityScore" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL,
  "status" "BidAnomalyStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bid_anomalies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "bid_anomalies_jobId_status_idx" ON "bid_anomalies"("jobId", "status");
CREATE INDEX IF NOT EXISTS "bid_anomalies_providerId_status_idx" ON "bid_anomalies"("providerId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bid_anomalies_bidId_fkey'
  ) THEN
    ALTER TABLE "bid_anomalies"
      ADD CONSTRAINT "bid_anomalies_bidId_fkey"
      FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bid_anomalies_jobId_fkey'
  ) THEN
    ALTER TABLE "bid_anomalies"
      ADD CONSTRAINT "bid_anomalies_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bid_anomalies_providerId_fkey'
  ) THEN
    ALTER TABLE "bid_anomalies"
      ADD CONSTRAINT "bid_anomalies_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bid_anomalies_reviewedById_fkey'
  ) THEN
    ALTER TABLE "bid_anomalies"
      ADD CONSTRAINT "bid_anomalies_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "dispute_resolutions" (
  "id" TEXT NOT NULL,
  "disputeId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "decision" "DisputeDecision" NOT NULL,
  "refundAmount" DOUBLE PRECISION,
  "remarks" TEXT,
  "resolvedById" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispute_resolutions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "dispute_resolutions_disputeId_createdAt_idx" ON "dispute_resolutions"("disputeId", "createdAt");
CREATE INDEX IF NOT EXISTS "dispute_resolutions_jobId_createdAt_idx" ON "dispute_resolutions"("jobId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispute_resolutions_disputeId_fkey'
  ) THEN
    ALTER TABLE "dispute_resolutions"
      ADD CONSTRAINT "dispute_resolutions_disputeId_fkey"
      FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispute_resolutions_jobId_fkey'
  ) THEN
    ALTER TABLE "dispute_resolutions"
      ADD CONSTRAINT "dispute_resolutions_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispute_resolutions_resolvedById_fkey'
  ) THEN
    ALTER TABLE "dispute_resolutions"
      ADD CONSTRAINT "dispute_resolutions_resolvedById_fkey"
      FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "payment_action_logs" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_action_logs_paymentId_createdAt_idx" ON "payment_action_logs"("paymentId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_action_logs_paymentId_fkey'
  ) THEN
    ALTER TABLE "payment_action_logs"
      ADD CONSTRAINT "payment_action_logs_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_action_logs_adminId_fkey'
  ) THEN
    ALTER TABLE "payment_action_logs"
      ADD CONSTRAINT "payment_action_logs_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "admin_sessions" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_sessions_adminId_expiresAt_idx" ON "admin_sessions"("adminId", "expiresAt");
CREATE INDEX IF NOT EXISTS "admin_sessions_refreshTokenHash_idx" ON "admin_sessions"("refreshTokenHash");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_sessions_adminId_fkey'
  ) THEN
    ALTER TABLE "admin_sessions"
      ADD CONSTRAINT "admin_sessions_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "notification_campaigns" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "payload" JSONB,
  "sentById" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalSent" INTEGER NOT NULL DEFAULT 0,
  "totalFailed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notification_campaigns_sentById_sentAt_idx" ON "notification_campaigns"("sentById", "sentAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_campaigns_sentById_fkey'
  ) THEN
    ALTER TABLE "notification_campaigns"
      ADD CONSTRAINT "notification_campaigns_sentById_fkey"
      FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
