ALTER TABLE "service_requests"
ADD COLUMN IF NOT EXISTS "orderId" TEXT;

UPDATE "service_requests"
SET "orderId" = CONCAT('VXA-LEGACY-', UPPER(SUBSTRING(REPLACE("id", '-', ''), 1, 12)))
WHERE "orderId" IS NULL;

ALTER TABLE "service_requests"
ALTER COLUMN "orderId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'service_requests_orderId_key'
  ) THEN
    CREATE UNIQUE INDEX "service_requests_orderId_key" ON "service_requests"("orderId");
  END IF;
END
$$;
