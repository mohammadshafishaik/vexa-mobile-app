import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import razorpay from '../lib/razorpay';
import { authMiddleware } from '../middleware/auth';
import { createAndPushNotification } from '../utils/notificationHelper';
import { getIO } from '../lib/socket';
const router = Router();
const safeSocketEmit = (eventName, payload) => {
    try {
        getIO().emit(eventName, payload);
    }
    catch (e) { }
};
const getHeaderValue = (value) => {
    if (!value)
        return undefined;
    return Array.isArray(value) ? value[0] : value;
};
const verifyWebhookSignature = (rawBody, signature, secret) => {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (signature.length !== expected.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};
const getGatewayErrorMessage = (error, fallback) => {
    if (!error)
        return fallback;
    return (error?.error?.description
        || error?.description
        || error?.message
        || error?.response?.data?.message
        || fallback);
};
const getGatewayErrorCode = (error) => {
    return error?.error?.code || error?.code;
};
export const razorpayWebhookHandler = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('[Payments] webhook error: RAZORPAY_WEBHOOK_SECRET is not configured');
            res.status(500).json({ success: false, message: 'Webhook secret is not configured' });
            return;
        }
        const webhookSignature = getHeaderValue(req.headers['x-razorpay-signature']);
        if (!webhookSignature) {
            res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
            return;
        }
        if (!Buffer.isBuffer(req.body)) {
            res.status(400).json({ success: false, message: 'Invalid webhook payload format' });
            return;
        }
        const rawBody = req.body.toString('utf8');
        if (!verifyWebhookSignature(rawBody, webhookSignature, webhookSecret)) {
            res.status(400).json({ success: false, message: 'Invalid webhook signature' });
            return;
        }
        const payload = JSON.parse(rawBody);
        const event = payload?.event;
        const paymentEntity = payload?.payload?.payment?.entity;
        const orderEntity = payload?.payload?.order?.entity;
        const razorpayOrderId = (paymentEntity?.order_id || orderEntity?.id);
        const razorpayPaymentId = paymentEntity?.id;
        if (!event || !razorpayOrderId) {
            console.warn('[Payments] webhook ignored due to missing event/order id');
            res.status(200).json({ success: true, message: 'Webhook ignored' });
            return;
        }
        const paymentRecord = await prisma.payment.findFirst({
            where: {
                OR: [
                    { razorpayOrderId },
                    ...(razorpayPaymentId ? [{ razorpayPaymentId }] : []),
                ],
            },
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        customerId: true,
                        selectedProviderId: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!paymentRecord) {
            console.warn('[Payments] webhook payment not found for order:', razorpayOrderId);
            res.status(200).json({ success: true, message: 'No matching payment found' });
            return;
        }
        const isSuccessEvent = event === 'payment.captured' || event === 'order.paid';
        const isFailureEvent = event === 'payment.failed';
        if (isSuccessEvent) {
            const transitionResult = await prisma.$transaction(async (tx) => {
                const updated = await tx.payment.updateMany({
                    where: {
                        id: paymentRecord.id,
                        status: { not: 'COMPLETED' },
                    },
                    data: {
                        status: 'COMPLETED',
                        razorpayPaymentId: razorpayPaymentId || paymentRecord.razorpayPaymentId,
                        razorpaySignature: webhookSignature,
                    },
                });
                if (updated.count > 0) {
                    await tx.serviceRequest.update({
                        where: { id: paymentRecord.jobId },
                        data: { status: 'PAID' },
                    });
                }
                return updated.count;
            });
            if (transitionResult > 0) {
                const latestPayment = await prisma.payment.findUnique({ where: { id: paymentRecord.id } });
                if (paymentRecord.payeeId) {
                    await createAndPushNotification({
                        userId: paymentRecord.payeeId,
                        type: 'PAYMENT_RECEIVED',
                        title: 'Payment Received! 💰',
                        body: `You received ₹${paymentRecord.amount} for "${paymentRecord.job.title}"`,
                        data: { jobId: paymentRecord.jobId, paymentId: paymentRecord.id },
                    });
                }
                await createAndPushNotification({
                    userId: paymentRecord.payerId,
                    type: 'PAYMENT_COMPLETED',
                    title: 'Payment Successful ✅',
                    body: `Your payment of ₹${paymentRecord.amount} for "${paymentRecord.job.title}" is confirmed`,
                    data: { jobId: paymentRecord.jobId, paymentId: paymentRecord.id },
                });
                safeSocketEmit('payment:completed', { jobId: paymentRecord.jobId, payment: latestPayment });
            }
            res.status(200).json({
                success: true,
                message: transitionResult > 0 ? 'Payment marked as completed' : 'Payment already completed',
            });
            return;
        }
        if (isFailureEvent) {
            const updateResult = await prisma.payment.updateMany({
                where: {
                    id: paymentRecord.id,
                    status: { not: 'COMPLETED' },
                },
                data: {
                    status: 'FAILED',
                    razorpayPaymentId: razorpayPaymentId || paymentRecord.razorpayPaymentId,
                    razorpaySignature: webhookSignature,
                },
            });
            if (updateResult.count > 0) {
                await createAndPushNotification({
                    userId: paymentRecord.payerId,
                    type: 'SYSTEM',
                    title: 'Payment Failed',
                    body: `Payment attempt for "${paymentRecord.job.title}" failed. Please retry.`,
                    data: { jobId: paymentRecord.jobId, paymentId: paymentRecord.id },
                });
                if (paymentRecord.payeeId) {
                    await createAndPushNotification({
                        userId: paymentRecord.payeeId,
                        type: 'SYSTEM',
                        title: 'Customer Payment Failed',
                        body: `Customer payment for "${paymentRecord.job.title}" failed and is pending retry.`,
                        data: { jobId: paymentRecord.jobId, paymentId: paymentRecord.id },
                    });
                }
                safeSocketEmit('payment:failed', {
                    jobId: paymentRecord.jobId,
                    paymentId: paymentRecord.id,
                    razorpayOrderId,
                });
            }
            res.status(200).json({
                success: true,
                message: updateResult.count > 0 ? 'Payment marked as failed' : 'Payment already settled',
            });
            return;
        }
        res.status(200).json({ success: true, message: `Ignored event: ${event}` });
    }
    catch (error) {
        console.error('[Payments] webhook error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// Commission & Tax configuration
const getCommissionConfig = () => ({
    commissionRate: Number(process.env.PLATFORM_COMMISSION_RATE) || 0.10,
    gstRate: Number(process.env.GST_RATE) || 0.18,
});
const calculateCommission = (amount) => {
    const { commissionRate, gstRate } = getCommissionConfig();
    const platformCommission = Math.round(amount * commissionRate * 100) / 100;
    const gstAmount = Math.round(platformCommission * gstRate * 100) / 100;
    const providerPayout = Math.round((amount - platformCommission - gstAmount) * 100) / 100;
    return { platformCommission, commissionRate, gstAmount, gstRate, providerPayout };
};
const buildRazorpayReceipt = (jobId) => {
    const compactJobId = jobId.replace(/-/g, '').slice(-12);
    const timePart = Date.now().toString(36);
    return `vxa_${compactJobId}_${timePart}`.slice(0, 40);
};
// ─── POST /api/payments/create-order ──────────────────────
// Creates a REAL Razorpay order and returns the order ID + key to the frontend
router.post('/create-order', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.body;
        if (!jobId) {
            res.status(400).json({ success: false, message: 'jobId is required' });
            return;
        }
        console.log('[Payments] Creating order for jobId:', jobId, 'userId:', req.user.userId);
        const job = await prisma.serviceRequest.findUnique({
            where: { id: jobId },
            include: { selectedProvider: true },
        });
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found' });
            return;
        }
        if (!job.selectedProviderId) {
            res.status(400).json({ success: false, message: 'No provider assigned to this job' });
            return;
        }
        if (job.customerId !== req.user.userId) {
            res.status(403).json({ success: false, message: 'Only the customer can initiate payment' });
            return;
        }
        // Verify provider exists
        const provider = await prisma.user.findUnique({
            where: { id: job.selectedProviderId },
        });
        if (!provider) {
            res.status(400).json({ success: false, message: 'Provider not found' });
            return;
        }
        const amount = Number(job.revisedPrice || job.originalPrice);
        const amountInPaise = Math.round(amount * 100); // Razorpay expects paise
        console.log('[Payments] Payment details - amount:', amount, 'payerId:', req.user.userId, 'payeeId:', job.selectedProviderId);
        // Create a REAL Razorpay order
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: buildRazorpayReceipt(jobId),
            notes: {
                jobId,
                customerId: req.user.userId,
                providerId: job.selectedProviderId,
            },
        });
        // Create a PENDING payment record in our database
        const securityHash = crypto.createHash('sha256')
            .update(`${jobId}-${amount}-${Date.now()}-${order.id}`)
            .digest('hex');
        const commissionBreakdown = calculateCommission(amount);
        const paymentData = {
            jobId,
            payerId: req.user.userId,
            payeeId: job.selectedProviderId,
            amount,
            currency: 'INR',
            razorpayOrderId: order.id,
            securityHash,
            status: 'PENDING',
            paymentMethod: 'RAZORPAY',
            platformCommission: commissionBreakdown.platformCommission,
            commissionRate: commissionBreakdown.commissionRate,
            gstAmount: commissionBreakdown.gstAmount,
            gstRate: commissionBreakdown.gstRate,
            providerPayout: commissionBreakdown.providerPayout,
        };
        console.log('[Payments] Creating payment with data:', paymentData);
        try {
            await prisma.payment.create({ data: paymentData });
        }
        catch (paymentError) {
            console.error('[Payments] Payment creation error details:', {
                error: paymentError.message,
                code: paymentError.code,
                meta: paymentError.meta,
                data: paymentData,
            });
            throw paymentError;
        }
        // Update job status to PAYMENT_PENDING
        await prisma.serviceRequest.update({
            where: { id: jobId },
            data: { status: 'PAYMENT_PENDING' },
        });
        res.status(201).json({
            success: true,
            data: {
                orderId: order.id,
                amount: amountInPaise,
                currency: 'INR',
                keyId: process.env.RAZORPAY_KEY_ID,
                jobTitle: job.title,
            },
        });
    }
    catch (error) {
        const message = getGatewayErrorMessage(error, 'Failed to create payment order. Please try again.');
        const code = getGatewayErrorCode(error);
        const statusCode = Number(error?.statusCode);
        console.error('[Payments] create-order error:', {
            message,
            code,
            statusCode: Number.isFinite(statusCode) ? statusCode : undefined,
            raw: error,
        });
        res.status(500).json({
            success: false,
            message,
            ...(code ? { code } : {}),
            ...(Number.isFinite(statusCode) ? { gatewayStatusCode: statusCode } : {}),
        });
    }
});
// ─── POST /api/payments/verify ────────────────────────────
// Cryptographically verifies the Razorpay signature — ZERO dummy logic
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const { jobId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        if (!jobId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            res.status(400).json({ success: false, message: 'Missing required payment verification fields' });
            return;
        }
        // ─── Cryptographic signature verification ───
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');
        if (expectedSignature !== razorpaySignature) {
            // Signature mismatch — payment is FRAUDULENT
            await prisma.payment.updateMany({
                where: { razorpayOrderId },
                data: { status: 'FAILED' },
            });
            res.status(400).json({ success: false, message: 'Payment verification failed — signature mismatch' });
            return;
        }
        // ─── Signature matches — payment is LEGITIMATE ───
        const transitionResult = await prisma.payment.updateMany({
            where: {
                razorpayOrderId,
                status: { not: 'COMPLETED' },
            },
            data: {
                razorpayPaymentId,
                razorpaySignature,
                status: 'COMPLETED',
            },
        });
        // Get the payment record for the response
        const paymentRecord = await prisma.payment.findFirst({
            where: { razorpayOrderId },
        });
        if (!paymentRecord) {
            res.status(404).json({ success: false, message: 'Payment record not found' });
            return;
        }
        if (transitionResult.count > 0) {
            // Update job status to PAID only on first successful transition
            const job = await prisma.serviceRequest.update({
                where: { id: jobId },
                data: { status: 'PAID' },
                include: { selectedProvider: true, customer: true },
            });
            // ─── Real-time notifications ───
            // Notify provider that payment was received
            if (job.selectedProviderId) {
                await createAndPushNotification({
                    userId: job.selectedProviderId,
                    type: 'PAYMENT_RECEIVED',
                    title: 'Payment Received! 💰',
                    body: `You received ₹${paymentRecord.amount} for "${job.title}"`,
                    data: { jobId, paymentId: paymentRecord.id },
                });
            }
            // Notify customer that payment was successful
            await createAndPushNotification({
                userId: job.customerId,
                type: 'PAYMENT_COMPLETED',
                title: 'Payment Successful ✅',
                body: `Your payment of ₹${paymentRecord.amount} for "${job.title}" is confirmed`,
                data: { jobId, paymentId: paymentRecord.id },
            });
            // Broadcast payment event
            safeSocketEmit('payment:completed', { jobId, payment: paymentRecord });
        }
        res.json({
            success: true,
            data: paymentRecord,
            message: transitionResult.count > 0 ? 'Payment verified successfully' : 'Payment already verified',
        });
    }
    catch (error) {
        console.error('[Payments] verify error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── GET /api/payments/job/:jobId ─────────────────────────
router.get('/job/:jobId', authMiddleware, async (req, res) => {
    try {
        const payment = await prisma.payment.findFirst({
            where: { jobId: req.params.jobId },
            orderBy: { createdAt: 'desc' },
        });
        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }
        res.json({ success: true, data: payment });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── GET /api/payments/history ────────────────────────────
// Get payment history for the authenticated user (as payer or payee)
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const payments = await prisma.payment.findMany({
            where: {
                OR: [
                    { payerId: req.user.userId },
                    { payeeId: req.user.userId },
                ],
            },
            include: {
                job: { select: { id: true, title: true, categoryName: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit),
        });
        res.json({ success: true, data: payments });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── POST /api/payments/cash ─────────────────────────────
// Customer submits cash payment; provider confirmation is required
router.post('/cash', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.body;
        if (!jobId) {
            res.status(400).json({ success: false, message: 'jobId is required' });
            return;
        }
        const job = await prisma.serviceRequest.findUnique({
            where: { id: jobId },
            include: { selectedProvider: true, customer: true },
        });
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found' });
            return;
        }
        if (job.customerId !== req.user.userId) {
            res.status(403).json({ success: false, message: 'Only the customer can initiate payment' });
            return;
        }
        if (!job.selectedProviderId) {
            res.status(400).json({ success: false, message: 'No provider assigned to this job' });
            return;
        }
        if (job.status !== 'PAYMENT_PENDING') {
            res.status(400).json({
                success: false,
                message: `Cash payment cannot be submitted while job status is "${job.status}"`,
            });
            return;
        }
        const existingCashPayment = await prisma.payment.findFirst({
            where: {
                jobId,
                paymentMethod: 'CASH',
            },
            orderBy: { createdAt: 'desc' },
        });
        if (existingCashPayment?.status === 'PENDING') {
            res.status(409).json({
                success: false,
                message: 'Cash payment is already awaiting provider confirmation',
            });
            return;
        }
        if (existingCashPayment?.status === 'COMPLETED') {
            res.status(400).json({
                success: false,
                message: 'This job already has a confirmed cash payment',
            });
            return;
        }
        const amount = Number(job.revisedPrice || job.originalPrice);
        const commissionBreakdown = calculateCommission(amount);
        const securityHash = crypto.createHash('sha256')
            .update(`${jobId}-${req.user.userId}-${job.selectedProviderId}-${amount}-${Date.now()}-cash`)
            .digest('hex');
        // Create cash payment record in pending state until provider confirms receipt
        const payment = await prisma.payment.create({
            data: {
                jobId,
                payerId: req.user.userId,
                payeeId: job.selectedProviderId,
                amount,
                currency: 'INR',
                paymentMethod: 'CASH',
                securityHash,
                status: 'PENDING',
                platformCommission: commissionBreakdown.platformCommission,
                commissionRate: commissionBreakdown.commissionRate,
                gstAmount: commissionBreakdown.gstAmount,
                gstRate: commissionBreakdown.gstRate,
                providerPayout: commissionBreakdown.providerPayout,
            },
        });
        // Notify provider
        if (job.selectedProviderId) {
            await createAndPushNotification({
                userId: job.selectedProviderId,
                type: 'SYSTEM',
                title: 'Confirm Cash Receipt',
                body: `Customer marked ₹${amount} cash payment for "${job.title}". Confirm once received.`,
                data: { jobId, paymentId: payment.id },
            });
        }
        // Notify customer
        await createAndPushNotification({
            userId: job.customerId,
            type: 'SYSTEM',
            title: 'Waiting for Provider Confirmation',
            body: `Your cash payment for "${job.title}" was submitted. Provider confirmation is pending.`,
            data: { jobId, paymentId: payment.id },
        });
        safeSocketEmit('payment:pending', { jobId, payment });
        res.status(201).json({ success: true, data: payment });
    }
    catch (error) {
        console.error('[Payments] cash error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── POST /api/payments/cash/confirm ─────────────────────
// Provider confirms that cash was received; only then payment becomes completed
router.post('/cash/confirm', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.body;
        if (!jobId) {
            res.status(400).json({ success: false, message: 'jobId is required' });
            return;
        }
        const job = await prisma.serviceRequest.findUnique({
            where: { id: jobId },
            include: { selectedProvider: true, customer: true },
        });
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found' });
            return;
        }
        if (!job.selectedProviderId || job.selectedProviderId !== req.user.userId) {
            res.status(403).json({ success: false, message: 'Only assigned provider can confirm cash receipt' });
            return;
        }
        const pendingCashPayment = await prisma.payment.findFirst({
            where: {
                jobId,
                paymentMethod: 'CASH',
                status: 'PENDING',
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!pendingCashPayment) {
            res.status(404).json({ success: false, message: 'No pending cash payment found for this job' });
            return;
        }
        if (pendingCashPayment.payeeId !== req.user.userId) {
            res.status(403).json({ success: false, message: 'You are not authorized to confirm this cash payment' });
            return;
        }
        const result = await prisma.$transaction(async (tx) => {
            const updatedPayment = await tx.payment.update({
                where: { id: pendingCashPayment.id },
                data: { status: 'COMPLETED' },
            });
            const updatedJob = await tx.serviceRequest.update({
                where: { id: jobId },
                data: { status: 'PAID' },
                include: { selectedProvider: true, customer: true },
            });
            return { updatedPayment, updatedJob };
        });
        await createAndPushNotification({
            userId: job.customerId,
            type: 'PAYMENT_COMPLETED',
            title: 'Cash Payment Confirmed ✅',
            body: `Provider confirmed receiving ₹${result.updatedPayment.amount} in cash for "${job.title}"`,
            data: { jobId, paymentId: result.updatedPayment.id },
        });
        await createAndPushNotification({
            userId: req.user.userId,
            type: 'PAYMENT_RECEIVED',
            title: 'Cash Receipt Confirmed',
            body: `You confirmed cash receipt for "${job.title}"`,
            data: { jobId, paymentId: result.updatedPayment.id },
        });
        safeSocketEmit('payment:completed', { jobId, payment: result.updatedPayment, job: result.updatedJob });
        res.json({
            success: true,
            data: {
                payment: result.updatedPayment,
                job: result.updatedJob,
            },
        });
    }
    catch (error) {
        console.error('[Payments] cash confirm error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
export default router;
//# sourceMappingURL=payments.js.map