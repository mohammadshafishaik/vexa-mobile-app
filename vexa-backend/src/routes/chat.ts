import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';
import { createAndPushNotification } from '../utils/notificationHelper';

const router = Router();

// ─── GET /api/chat/conversations — list all active chats ──
router.get('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Find all jobs where the user is either customer or selected provider
    const jobs = await prisma.serviceRequest.findMany({
      where: {
        OR: [
          { customerId: userId },
          { selectedProviderId: userId },
        ],
        selectedProviderId: { not: null },
        status: { notIn: ['POSTED', 'CANCELLED'] },
      },
      select: {
        id: true,
        title: true,
        orderId: true,
        status: true,
        customerId: true,
        selectedProviderId: true,
        customer: { select: { id: true, name: true, avatarUrl: true } },
        selectedProvider: { select: { id: true, name: true, avatarUrl: true } },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
            messageType: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Count unread messages per job
    const conversations = await Promise.all(
      jobs.map(async (job) => {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            jobId: job.id,
            receiverId: userId,
            isRead: false,
          },
        });

        const otherUser = job.customerId === userId ? job.selectedProvider : job.customer;
        const lastMessage = job.chatMessages[0] || null;

        return {
          jobId: job.id,
          jobTitle: job.title,
          orderId: job.orderId,
          jobStatus: job.status,
          otherUser,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by latest message
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ success: true, data: conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/chat/:jobId — get messages for a job ────────
router.get('/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.jobId as string;
    const { page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Verify user is a participant in this job
    const job = await prisma.serviceRequest.findUnique({
      where: { id: jobId },
      select: { customerId: true, selectedProviderId: true },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    if (job.customerId !== userId && job.selectedProviderId !== userId) {
      res.status(403).json({ success: false, message: 'You are not a participant in this job' });
      return;
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { jobId },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.chatMessage.count({ where: { jobId } }),
    ]);

    res.json({
      success: true,
      data: messages.reverse(), // oldest first for display
      total,
      page: Number(page),
      limit: Number(limit),
      hasMore: skip + messages.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/chat/:jobId — send a message ──────────────
router.post('/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.jobId as string;
    const { content, messageType, imageUrl } = req.body;

    if (!content && messageType !== 'IMAGE') {
      res.status(400).json({ success: false, message: 'Message content is required' });
      return;
    }

    const job = await prisma.serviceRequest.findUnique({
      where: { id: jobId },
      select: { customerId: true, selectedProviderId: true, title: true },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    if (job.customerId !== userId && job.selectedProviderId !== userId) {
      res.status(403).json({ success: false, message: 'You are not a participant in this job' });
      return;
    }

    // Determine the receiver
    const receiverId = job.customerId === userId
      ? job.selectedProviderId!
      : job.customerId;

    const message = await prisma.chatMessage.create({
      data: {
        jobId,
        senderId: userId,
        receiverId,
        content: content || '',
        messageType: messageType || 'TEXT',
        imageUrl: imageUrl || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Broadcast via Socket.io
    try {
      getIO().to(`chat:${jobId}`).emit('chat:message', message);
      // Also send to user-specific room for notification badge
      getIO().to(`user:${receiverId}`).emit('chat:newMessage', {
        jobId,
        message,
      });
    } catch (e) {}

    // Push notification to receiver
    try {
      await createAndPushNotification({
        userId: receiverId,
        type: 'NEW_MESSAGE',
        title: `New message from ${message.sender.name}`,
        body: messageType === 'IMAGE' ? '📷 Sent a photo' : content.substring(0, 100),
        data: { jobId, messageId: message.id },
      });
    } catch (e) {}

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/chat/:jobId/read — mark messages as read ──
router.patch('/:jobId/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.jobId as string;

    await prisma.chatMessage.updateMany({
      where: {
        jobId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    // Notify sender that messages were read
    try {
      getIO().to(`chat:${jobId}`).emit('chat:read', { jobId, readBy: userId });
    } catch (e) {}

    res.json({ success: true, data: { message: 'Messages marked as read' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
