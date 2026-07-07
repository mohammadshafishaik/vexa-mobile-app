import type { Prisma } from '@prisma/client';
export interface EscrowCreateInput {
    jobId: string;
    customerId: string;
    providerId: string;
    amount: number;
}
export interface EscrowResult {
    success: boolean;
    escrowId?: string;
    razorpayOrderId?: string;
    amount?: number;
    error?: string;
}
export interface EscrowReleaseResult {
    success: boolean;
    providerPayout?: number;
    platformFee?: number;
    error?: string;
}
/**
 * Creates a Razorpay order and an EscrowTransaction record.
 * The escrow starts in PENDING status and moves to HELD after payment capture.
 */
export declare function createEscrowHold(input: EscrowCreateInput): Promise<EscrowResult>;
/**
 * Called after Razorpay payment is verified. Moves escrow from PENDING → HELD.
 */
export declare function captureEscrowPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<EscrowResult>;
/**
 * Releases escrowed funds to the provider. Only works when status is HELD.
 */
export declare function releaseEscrow(escrowId: string, releasedBy?: string): Promise<EscrowReleaseResult>;
/**
 * Full or partial refund of escrowed funds to the customer.
 */
export declare function refundEscrow(escrowId: string, refundAmount?: number, reason?: string, adminId?: string): Promise<EscrowResult>;
/**
 * Locks escrow to prevent release during active dispute.
 */
export declare function lockForDispute(escrowId: string, disputeId: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function unlockFromDispute(escrowId: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function getEscrowStatus(jobId: string): Promise<({
    payment: {
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        providerPayout: Prisma.Decimal;
        amount: Prisma.Decimal;
        platformCommission: Prisma.Decimal;
        razorpayPaymentId: string | null;
    } | null;
    dispute: {
        id: string;
        status: import("@prisma/client").$Enums.DisputeStatus;
    } | null;
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import("@prisma/client").$Enums.EscrowStatus;
    metadata: Prisma.JsonValue | null;
    providerId: string;
    providerPayout: Prisma.Decimal;
    amount: Prisma.Decimal;
    refundAmount: Prisma.Decimal | null;
    jobId: string;
    customerId: string;
    currency: string;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    refundedAt: Date | null;
    paymentId: string | null;
    disputeId: string | null;
    platformFee: Prisma.Decimal;
    razorpayTransferId: string | null;
    heldAt: Date | null;
    releaseRequestedAt: Date | null;
    releasedAt: Date | null;
    isDisputeLocked: boolean;
    autoReleaseAt: Date | null;
    autoReleased: boolean;
}) | null>;
/**
 * Process auto-releases for escrows past their autoReleaseAt time.
 * Should be called by a cron job (e.g., every 15 minutes).
 */
export declare function processAutoReleases(): Promise<{
    released: number;
    failed: number;
}>;
//# sourceMappingURL=escrow.d.ts.map