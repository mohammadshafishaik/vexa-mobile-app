import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';
import { createAndPushNotification } from '../utils/notificationHelper';
import { sendModificationRequestEmail } from '../lib/email';

const router = Router();

// POST /api/modifications — submit a modification request
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId, revisionReason, revisedPrice, revisionImages } = req.body;

    if (!jobId || !revisionReason || !revisedPrice) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const job = await prisma.serviceRequest.findUnique({
      where: { id: jobId },
      include: { customer: true },
    });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    if (job.selectedProviderId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Only the assigned provider can request modifications' });
      return;
    }
    if (job.modificationCount >= job.maxModifications) {
      res.status(400).json({ success: false, message: 'Maximum modifications reached' });
      return;
    }

    const securityHash = crypto.createHash('sha256')
      .update(`${jobId}-${revisedPrice}-${Date.now()}-${uuidv4()}`)
      .digest('hex');

    const modification = await prisma.jobModification.create({
      data: {
        jobId,
        providerId: req.user!.userId,
        revisionReason,
        originalPrice: job.revisedPrice || job.originalPrice,
        revisedPrice: Number(revisedPrice),
        revisionImages: revisionImages || [],
        securityHash,
      },
    });

    // Update job
    await prisma.serviceRequest.update({
      where: { id: jobId },
      data: {
        status: 'MODIFICATION_REQUESTED',
        modificationCount: { increment: 1 },
      },
    });

    // Notify customer
    const notification = await createAndPushNotification({
      userId: job.customerId,
      type: 'MODIFICATION_REQUEST',
      title: 'Modification Request',
      body: `Provider requested a price change to ₹${revisedPrice} on "${job.title}"`,
      data: { jobId, modificationId: modification.id },
    });

    if (job.customer) {
      sendModificationRequestEmail(job.customer.email, {
        customerName: job.customer.name,
        jobTitle: job.title,
        orderId: job.orderId,
        originalPrice: String(job.revisedPrice || job.originalPrice),
        revisedPrice: String(revisedPrice),
        reason: revisionReason,
      }).catch(err => console.error('Failed to send modification request email:', err));
    }

    // Emit Socket.io events
    try {
      const io = getIO();
      io.to(`user:${job.customerId}`).emit('modification:requested', {
        jobId,
        modification,
        notification,
      });
      io.to(`bidding:${jobId}`).emit('job:statusChange', {
        jobId,
        status: 'MODIFICATION_REQUESTED',
      });
    } catch (e) {
      console.error('Socket.io emit error:', e);
    }

    res.status(201).json({ success: true, data: modification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/modifications/:id — approve or reject
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { approvalStatus, customerResponse } = req.body;

    if (!approvalStatus || !['APPROVED', 'REJECTED'].includes(approvalStatus)) {
      res.status(400).json({ success: false, message: 'Valid approvalStatus required (APPROVED/REJECTED)' });
      return;
    }

    const modification = await prisma.jobModification.findUnique({
      where: { id: req.params.id as string },
      include: { job: true },
    });

    if (!modification) {
      res.status(404).json({ success: false, message: 'Modification not found' });
      return;
    }
    if (modification.job.customerId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Only the customer can approve/reject' });
      return;
    }

    const updated = await prisma.jobModification.update({
      where: { id: req.params.id as string },
      data: {
        approvalStatus,
        customerResponse: customerResponse || null,
      },
    });

    // Update job based on approval
    if (approvalStatus === 'APPROVED') {
      await prisma.serviceRequest.update({
        where: { id: modification.jobId },
        data: {
          status: 'IN_PROGRESS',
          revisedPrice: modification.revisedPrice,
        },
      });
    } else {
      await prisma.serviceRequest.update({
        where: { id: modification.jobId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Notify provider
    const notification = await createAndPushNotification({
      userId: modification.providerId,
      type: approvalStatus === 'APPROVED' ? 'MODIFICATION_APPROVED' : 'MODIFICATION_REJECTED',
      title: `Modification ${approvalStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      body: `Your modification on "${modification.job.title}" was ${approvalStatus.toLowerCase()}`,
      data: { jobId: modification.jobId, modificationId: modification.id },
    });

    // Emit Socket.io events
    try {
      const io = getIO();
      io.to(`user:${modification.providerId}`).emit('modification:updated', {
        jobId: modification.jobId,
        modification: updated,
        approvalStatus,
        notification,
      });
      io.to(`bidding:${modification.jobId}`).emit('job:statusChange', {
        jobId: modification.jobId,
        status: approvalStatus === 'APPROVED' ? 'IN_PROGRESS' : 'IN_PROGRESS',
      });
    } catch (e) {
      console.error('Socket.io emit error:', e);
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
