-- Ensure payment schema works for both Razorpay and Cash flows in older deployments.
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'RAZORPAY';

ALTER TABLE "payments"
  ALTER COLUMN "securityHash" DROP NOT NULL;
