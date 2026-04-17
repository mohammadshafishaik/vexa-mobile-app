import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import razorpay from '../lib/razorpay';
import { authMiddleware } from '../middleware/auth';
import { createAndPushNotification } from '../utils/notificationHelper';
import { getIO } from '../lib/socket';

const router = Router();

// ─── POST /api/payments/create-order ──────────────────────
// Creates a REAL Razorpay order and returns the order ID + key to the frontend
router.post('/create-order', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      res.status(400).json({ success: false, message: 'jobId is required' });
      return;
    }

    console.log('[Payments] Creating order for jobId:', jobId, 'userId:', req.user!.userId);

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
    if (job.customerId !== req.user!.userId) {
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

    const amount = job.revisedPrice || job.originalPrice;
    const amountInPaise = Math.round(amount * 100); // Razorpay expects paise

    console.log('[Payments] Payment details - amount:', amount, 'payerId:', req.user!.userId, 'payeeId:', job.selectedProviderId);

    // Create a REAL Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `vexa_${jobId}_${Date.now()}`,
      notes: {
        jobId,
        customerId: req.user!.userId,
        providerId: job.selectedProviderId,
      },
    });

    // Create a PENDING payment record in our database
    const securityHash = crypto.createHash('sha256')
      .update(`${jobId}-${amount}-${Date.now()}-${order.id}`)
      .digest('hex');

    const paymentData = {
      jobId,
      payerId: req.user!.userId,
      payeeId: job.selectedProviderId,
      amount,
      currency: 'INR',
      razorpayOrderId: order.id,
      securityHash,
      status: 'PENDING' as const,
      paymentMethod: 'RAZORPAY',
    };

    console.log('[Payments] Creating payment with data:', paymentData);

    try {
      await prisma.payment.create({ data: paymentData });
    } catch (paymentError: any) {
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
  } catch (error: any) {
    console.error('[Payments] create-order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/payments/verify ────────────────────────────
// Cryptographically verifies the Razorpay signature — ZERO dummy logic
router.post('/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!jobId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({ success: false, message: 'Missing required payment verification fields' });
      return;
    }

    // ─── Cryptographic signature verification ───
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
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
    const payment = await prisma.payment.updateMany({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'COMPLETED',
      },
    });

    // Update job status to PAID
    const job = await prisma.serviceRequest.update({
      where: { id: jobId },
      data: { status: 'PAID' },
      include: { selectedProvider: true, customer: true },
    });

    // Get the payment record for the response
    const paymentRecord = await prisma.payment.findFirst({
      where: { razorpayOrderId },
    });

    // ─── Real-time notifications ───
    // Notify provider that payment was received
    if (job.selectedProviderId) {
      await createAndPushNotification({
        userId: job.selectedProviderId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received! 💰',
        body: `You received ₹${paymentRecord?.amount} for "${job.title}"`,
        data: { jobId, paymentId: paymentRecord?.id },
      });
    }

    // Notify customer that payment was successful
    await createAndPushNotification({
      userId: job.customerId,
      type: 'PAYMENT_COMPLETED',
      title: 'Payment Successful ✅',
      body: `Your payment of ₹${paymentRecord?.amount} for "${job.title}" is confirmed`,
      data: { jobId, paymentId: paymentRecord?.id },
    });

    // Broadcast payment event
    try {
      getIO().emit('payment:completed', { jobId, payment: paymentRecord });
    } catch (e) {}

    res.json({ success: true, data: paymentRecord });
  } catch (error: any) {
    console.error('[Payments] verify error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/payments/job/:jobId ─────────────────────────
router.get('/job/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { jobId: req.params.jobId as string },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/payments/history ────────────────────────────
// Get payment history for the authenticated user (as payer or payee)
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { payerId: req.user!.userId },
          { payeeId: req.user!.userId },
        ],
      },
      include: {
        job: { select: { id: true, title: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });

    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/payments/cash ─────────────────────────────
// Customer submits cash payment; provider confirmation is required
router.post('/cash', authMiddleware, async (req: Request, res: Response) => {
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
    if (job.customerId !== req.user!.userId) {
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

    const amount = job.revisedPrice || job.originalPrice;
    const securityHash = crypto.createHash('sha256')
      .update(`${jobId}-${req.user!.userId}-${job.selectedProviderId}-${amount}-${Date.now()}-cash`)
      .digest('hex');

    // Create cash payment record in pending state until provider confirms receipt
    const payment = await prisma.payment.create({
      data: {
        jobId,
        payerId: req.user!.userId,
        payeeId: job.selectedProviderId,
        amount,
        currency: 'INR',
        paymentMethod: 'CASH',
        securityHash,
        status: 'PENDING',
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

    try { getIO().emit('payment:pending', { jobId, payment }); } catch (e) {}

    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    console.error('[Payments] cash error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/payments/cash/confirm ─────────────────────
// Provider confirms that cash was received; only then payment becomes completed
router.post('/cash/confirm', authMiddleware, async (req: Request, res: Response) => {
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

    if (!job.selectedProviderId || job.selectedProviderId !== req.user!.userId) {
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

    if (pendingCashPayment.payeeId !== req.user!.userId) {
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
      userId: req.user!.userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Cash Receipt Confirmed',
      body: `You confirmed cash receipt for "${job.title}"`,
      data: { jobId, paymentId: result.updatedPayment.id },
    });

    try {
      getIO().emit('payment:completed', { jobId, payment: result.updatedPayment, job: result.updatedJob });
    } catch (e) {}

    res.json({
      success: true,
      data: {
        payment: result.updatedPayment,
        job: result.updatedJob,
      },
    });
  } catch (error: any) {
    console.error('[Payments] cash confirm error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
