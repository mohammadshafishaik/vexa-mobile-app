-- CreateEnum
CREATE TYPE "CancellationInitiator" AS ENUM ('CUSTOMER', 'PROVIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProviderAvailabilityStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CANCELLATION';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'LOCATION_UPDATE';

-- AlterTable
ALTER TABLE "kyc_documents" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
ADD COLUMN     "platformCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "providerPayout" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "cancellationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "providerLat" DOUBLE PRECISION,
ADD COLUMN     "providerLng" DOUBLE PRECISION,
ADD COLUMN     "providerLocationUpdatedAt" TIMESTAMP(3),
ALTER COLUMN "originalPrice" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "availabilityStatus" "ProviderAvailabilityStatus" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "lastLocationLat" DOUBLE PRECISION,
ADD COLUMN     "lastLocationLng" DOUBLE PRECISION,
ADD COLUMN     "lastLocationUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "imageUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_skills" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellations" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cancelledById" TEXT NOT NULL,
    "initiator" "CancellationInitiator" NOT NULL,
    "reason" TEXT NOT NULL,
    "cancellationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feePaid" BOOLEAN NOT NULL DEFAULT false,
    "ratingPenalty" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_availability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_jobId_createdAt_idx" ON "chat_messages"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_receiverId_idx" ON "chat_messages"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "provider_skills_category_idx" ON "provider_skills"("category");

-- CreateIndex
CREATE UNIQUE INDEX "provider_skills_providerId_category_key" ON "provider_skills"("providerId", "category");

-- CreateIndex
CREATE INDEX "cancellations_jobId_idx" ON "cancellations"("jobId");

-- CreateIndex
CREATE INDEX "portfolio_items_providerId_idx" ON "portfolio_items"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_availability_providerId_dayOfWeek_key" ON "provider_availability"("providerId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_skills" ADD CONSTRAINT "provider_skills_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_availability" ADD CONSTRAINT "provider_availability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
