// ═══════════════════════════════════════════════════════════════════════════════
// VEXA 2.0 — Escrow Payment Service
// Application-level escrow with Razorpay integration
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from './prisma';
import { sendPaymentSuccessEmail, sendEscrowReleasedEmail } from './email';
import razorpay from './razorpay';
import type { EscrowStatus, Prisma } from '@prisma/client';

// ─── Configuration ──────────────────────────────────────────────────────────

const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10'); // 10%
const GST_RATE = parseFloat(process.env.GST_RATE || '0.18'); // 18% on commission
const AUTO_RELEASE_HOURS = parseInt(process.env.ESCROW_AUTO_RELEASE_HOURS || '48', 10);
const CURRENCY = 'INR';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EscrowCreateInput {
  jobId: string;
  customerId: string;
  providerId: string;
  amount: number; // In rupees
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function calculateFees(amount: number) {
  const platformCommission = Math.round(amount * PLATFORM_COMMISSION_RATE * 100) / 100;
  const gstOnCommission = Math.round(platformCommission * GST_RATE * 100) / 100;
  const totalPlatformFee = Math.round((platformCommission + gstOnCommission) * 100) / 100;
  const providerPayout = Math.round((amount - totalPlatformFee) * 100) / 100;

  return { platformCommission, gstOnCommission, totalPlatformFee, providerPayout };
}

// ─── Create Escrow Hold ─────────────────────────────────────────────────────

/**
 * Creates a Razorpay order and an EscrowTransaction record.
 * The escrow starts in PENDING status and moves to HELD after payment capture.
 */
export async function createEscrowHold(input: EscrowCreateInput): Promise<EscrowResult> {
  try {
    const { jobId, customerId, providerId, amount } = input;
    const fees = calculateFees(amount);

    // Verify job exists and is in correct state
    const job = await prisma.serviceRequest.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, selectedProviderId: true },
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    if (job.selectedProviderId !== providerId) {
      return { success: false, error: 'Provider not selected for this job' };
    }

    // Check for existing active escrow on this job
    const existingEscrow = await prisma.escrowTransaction.findFirst({
      where: {
        jobId,
        status: { in: ['PENDING', 'HELD'] },
      },
    });

    if (existingEscrow) {
      return { success: false, error: 'Active escrow already exists for this job' };
    }

    // Create Razorpay order
    const amountInPaise = Math.round(amount * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: CURRENCY,
      receipt: `escrow_${jobId}`,
      notes: {
        jobId,
        customerId,
        providerId,
        type: 'escrow',
      },
    });

    // Create escrow transaction
    const escrow = await prisma.escrowTransaction.create({
      data: {
        jobId,
        customerId,
        providerId,
        amount,
        platformFee: fees.totalPlatformFee,
        providerPayout: fees.providerPayout,
        currency: CURRENCY,
        status: 'PENDING',
        razorpayOrderId: razorpayOrder.id,
        autoReleaseAt: null, // Set after payment capture
      },
    });

    return {
      success: true,
      escrowId: escrow.id,
      razorpayOrderId: razorpayOrder.id,
      amount,
    };
  } catch (error: any) {
    console.error('[Escrow] createEscrowHold failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── Capture Escrow Payment ─────────────────────────────────────────────────

/**
 * Called after Razorpay payment is verified. Moves escrow from PENDING → HELD.
 */
export async function captureEscrowPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<EscrowResult> {
  try {
    // Verify payment signature
    const crypto = await import('crypto');
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return { success: false, error: 'Invalid payment signature' };
    }

    const escrow = await prisma.escrowTransaction.findUnique({
      where: { razorpayOrderId },
      include: { customer: true, provider: true, job: true },
    });

    if (!escrow) {
      return { success: false, error: 'Escrow transaction not found' };
    }

    if (escrow.status !== 'PENDING') {
      return { success: false, error: `Cannot capture escrow in ${escrow.status} status` };
    }

    // Calculate auto-release time
    const autoReleaseAt = new Date();
    autoReleaseAt.setHours(autoReleaseAt.getHours() + AUTO_RELEASE_HOURS);

    // Update escrow and create payment in a transaction
    const [updatedEscrow, payment] = await prisma.$transaction([
      prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: 'HELD',
          razorpayPaymentId,
          heldAt: new Date(),
          autoReleaseAt,
        },
      }),
      prisma.payment.create({
        data: {
          jobId: escrow.jobId,
          payerId: escrow.customerId,
          payeeId: escrow.providerId,
          amount: escrow.amount,
          currency: escrow.currency,
          status: 'CAPTURED',
          paymentMethod: 'RAZORPAY',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          platformCommission: escrow.platformFee,
          commissionRate: PLATFORM_COMMISSION_RATE,
          gstAmount: Number(escrow.platformFee) * GST_RATE / (1 + GST_RATE), // Extract GST from total fee
          gstRate: GST_RATE,
          providerPayout: escrow.providerPayout,
        },
      }),
    ]);

    // Link payment to escrow
    await prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: { paymentId: payment.id },
    });

    const gstAmount = Number(escrow.platformFee) * GST_RATE / (1 + GST_RATE);
    const baseCommission = Number(escrow.platformFee) - gstAmount;
    sendPaymentSuccessEmail(escrow.customer.email, {
      name: escrow.customer.name,
      jobTitle: escrow.job.title,
      orderId: escrow.job.orderId,
      amount: (Number(escrow.amount) - Number(escrow.platformFee)).toFixed(2),
      gst: gstAmount.toFixed(2),
      commission: baseCommission.toFixed(2),
      total: String(escrow.amount),
      paymentId: razorpayPaymentId,
    }).catch(err => console.error('Failed to send payment success email:', err));

    return {
      success: true,
      escrowId: updatedEscrow.id,
      amount: Number(escrow.amount),
    };
  } catch (error: any) {
    console.error('[Escrow] captureEscrowPayment failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── Release Escrow ─────────────────────────────────────────────────────────

/**
 * Releases escrowed funds to the provider. Only works when status is HELD.
 */
export async function releaseEscrow(
  escrowId: string,
  releasedBy?: string
): Promise<EscrowReleaseResult> {
  try {
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
      include: { payment: true, provider: true, job: true },
    });

    if (!escrow) {
      return { success: false, error: 'Escrow not found' };
    }

    if (escrow.status !== 'HELD') {
      return { success: false, error: `Cannot release escrow in ${escrow.status} status` };
    }

    if (escrow.isDisputeLocked) {
      return { success: false, error: 'Escrow is locked due to active dispute' };
    }

    // Update escrow and payment in a transaction
    await prisma.$transaction([
      prisma.escrowTransaction.update({
        where: { id: escrowId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      }),
      ...(escrow.paymentId
        ? [
            prisma.payment.update({
              where: { id: escrow.paymentId },
              data: { status: 'COMPLETED' },
            }),
          ]
        : []),
      // Log the action if released by admin
      ...(releasedBy
        ? [
            prisma.paymentActionLog.create({
              data: {
                paymentId: escrow.paymentId || escrowId,
                adminId: releasedBy,
                action: 'release',
                reason: 'Manual escrow release',
                metadata: { escrowId },
              },
            }),
          ]
        : []),
    ]);

    sendEscrowReleasedEmail(escrow.provider.email, {
      providerName: escrow.provider.name,
      jobTitle: escrow.job.title,
      orderId: escrow.job.orderId,
      amount: String(escrow.amount),
      platformFee: String(escrow.platformFee),
      payout: String(escrow.providerPayout),
    }).catch(err => console.error('Failed to send escrow release email:', err));

    return {
      success: true,
      providerPayout: Number(escrow.providerPayout),
      platformFee: Number(escrow.platformFee),
    };
  } catch (error: any) {
    console.error('[Escrow] releaseEscrow failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── Refund Escrow ──────────────────────────────────────────────────────────

/**
 * Full or partial refund of escrowed funds to the customer.
 */
export async function refundEscrow(
  escrowId: string,
  refundAmount?: number,
  reason?: string,
  adminId?: string
): Promise<EscrowResult> {
  try {
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      return { success: false, error: 'Escrow not found' };
    }

    if (!['HELD', 'DISPUTED'].includes(escrow.status)) {
      return { success: false, error: `Cannot refund escrow in ${escrow.status} status` };
    }

    const actualRefundAmount = refundAmount ?? Number(escrow.amount);
    const isPartial = actualRefundAmount < Number(escrow.amount);
    const newStatus: EscrowStatus = isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

    // Process refund via Razorpay if payment exists
    let razorpayRefundId: string | undefined;
    if (escrow.razorpayPaymentId) {
      try {
        const refund = await razorpay.payments.refund(escrow.razorpayPaymentId, {
          amount: Math.round(actualRefundAmount * 100), // paise
          notes: { escrowId, reason: reason || 'Escrow refund' },
        });
        razorpayRefundId = refund.id;
      } catch (rpError: any) {
        console.error('[Escrow] Razorpay refund failed:', rpError.message);
        return { success: false, error: `Razorpay refund failed: ${rpError.message}` };
      }
    }

    // Update records
    await prisma.$transaction([
      prisma.escrowTransaction.update({
        where: { id: escrowId },
        data: {
          status: newStatus,
          refundAmount: actualRefundAmount,
          refundedAt: new Date(),
          isDisputeLocked: false,
        },
      }),
      ...(escrow.paymentId
        ? [
            prisma.payment.update({
              where: { id: escrow.paymentId },
              data: {
                status: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
                refundAmount: actualRefundAmount,
                refundReason: reason,
                refundedAt: new Date(),
                razorpayRefundId,
              },
            }),
          ]
        : []),
      ...(adminId && escrow.paymentId
        ? [
            prisma.paymentActionLog.create({
              data: {
                paymentId: escrow.paymentId,
                adminId,
                action: 'refund',
                reason: reason || 'Escrow refund',
                metadata: { escrowId, refundAmount: actualRefundAmount, razorpayRefundId },
              },
            }),
          ]
        : []),
    ]);

    return { success: true, escrowId, amount: actualRefundAmount };
  } catch (error: any) {
    console.error('[Escrow] refundEscrow failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── Lock / Unlock for Dispute ──────────────────────────────────────────────

/**
 * Locks escrow to prevent release during active dispute.
 */
export async function lockForDispute(escrowId: string, disputeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const escrow = await prisma.escrowTransaction.findUnique({ where: { id: escrowId } });

    if (!escrow) return { success: false, error: 'Escrow not found' };
    if (escrow.status !== 'HELD') return { success: false, error: `Cannot lock escrow in ${escrow.status} status` };

    await prisma.escrowTransaction.update({
      where: { id: escrowId },
      data: {
        isDisputeLocked: true,
        disputeId,
        status: 'DISPUTED',
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Escrow] lockForDispute failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function unlockFromDispute(escrowId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.escrowTransaction.update({
      where: { id: escrowId },
      data: {
        isDisputeLocked: false,
        status: 'HELD',
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Escrow] unlockFromDispute failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── Get Escrow Status ──────────────────────────────────────────────────────

export async function getEscrowStatus(jobId: string) {
  return prisma.escrowTransaction.findFirst({
    where: { jobId },
    orderBy: { createdAt: 'desc' },
    include: {
      payment: {
        select: {
          id: true,
          status: true,
          razorpayPaymentId: true,
          amount: true,
          platformCommission: true,
          providerPayout: true,
        },
      },
      dispute: {
        select: { id: true, status: true },
      },
    },
  });
}

// ─── Auto-Release Processor ────────────────────────────────────────────────

/**
 * Process auto-releases for escrows past their autoReleaseAt time.
 * Should be called by a cron job (e.g., every 15 minutes).
 */
export async function processAutoReleases(): Promise<{ released: number; failed: number }> {
  const now = new Date();
  let released = 0;
  let failed = 0;

  const eligibleEscrows = await prisma.escrowTransaction.findMany({
    where: {
      status: 'HELD',
      isDisputeLocked: false,
      autoReleased: false,
      autoReleaseAt: { lte: now },
    },
    take: 100, // Process in batches
  });

  for (const escrow of eligibleEscrows) {
    const result = await releaseEscrow(escrow.id);
    if (result.success) {
      await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: { autoReleased: true },
      });
      released++;
    } else {
      failed++;
      console.error(`[Escrow] Auto-release failed for ${escrow.id}: ${result.error}`);
    }
  }

  if (released > 0 || failed > 0) {
    console.log(`[Escrow] Auto-release: ${released} released, ${failed} failed`);
  }

  return { released, failed };
}
