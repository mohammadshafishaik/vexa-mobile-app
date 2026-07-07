import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { getIO } from '../lib/socket';
import { createAndPushNotification } from '../utils/notificationHelper';
import { MessageType } from '@prisma/client';

const router = Router();

// Helper to get or create a chat room for a job
async function getOrCreateRoomForJob(jobId: string, userId: string) {
  let room = await prisma.chatRoom.findUnique({
    where: { jobId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!room) {
    const job = await prisma.serviceRequest.findUnique({
      where: { id: jobId },
      select: { id: true, customerId: true, selectedProviderId: true },
    });

    if (!job || !job.selectedProviderId) return null;

    if (job.customerId !== userId && job.selectedProviderId !== userId) return null;

    room = await prisma.chatRoom.create({
      data: {
        jobId,
        members: {
          createMany: {
            data: [
              { userId: job.customerId },
              { userId: job.selectedProviderId },
            ],
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  return room;
}

// ─── GET /api/chat/conversations — list all active chats ──
router.get('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Find all chat rooms where user is a member
    const rooms = await prisma.chatRoom.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            orderId: true,
            status: true,
            customerId: true,
            selectedProviderId: true,
            customer: { select: { id: true, name: true, avatarUrl: true } },
            selectedProvider: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            senderId: true,
            messageType: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const conversations = await Promise.all(
      rooms.map(async (room) => {
        const myMember = room.members.find((m) => m.userId === userId);
        const lastReadAt = myMember?.lastReadAt;
        const unreadCount = lastReadAt
          ? await prisma.chatMessage.count({
              where: {
                chatRoomId: room.id,
                createdAt: { gt: lastReadAt },
              },
            })
          : 0;

        const otherMember = room.members.find((m) => m.userId !== userId);
        const otherUser = otherMember?.user || null;
        const lastMessage = room.messages[0] || null;

        return {
          jobId: room.jobId || room.id,
          jobTitle: room.job?.title || 'General Chat',
          orderId: room.job?.orderId || null,
          jobStatus: room.job?.status || 'ACTIVE',
          otherUser,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
                isRead: unreadCount === 0,
                messageType: lastMessage.messageType,
              }
            : null,
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

    const room = await getOrCreateRoomForJob(jobId, userId);
    if (!room) {
      res.status(404).json({ success: false, message: 'Chat room not found or not authorized' });
      return;
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { chatRoomId: room.id },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.chatMessage.count({ where: { chatRoomId: room.id } }),
    ]);

    // Map fields back to old style for frontend compatibility
    const formattedMessages = messages.map((m) => ({
      id: m.id,
      jobId,
      senderId: m.senderId,
      content: m.content,
      messageType: m.messageType,
      imageUrl: m.mediaUrl,
      createdAt: m.createdAt,
      sender: m.sender,
    }));

    res.json({
      success: true,
      data: formattedMessages.reverse(), // oldest first
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

    const room = await getOrCreateRoomForJob(jobId, userId);
    if (!room) {
      res.status(404).json({ success: false, message: 'Chat room not found or not authorized' });
      return;
    }

    const otherMember = room.members.find((m) => m.userId !== userId);
    const receiverId = otherMember?.userId;

    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId: room.id,
        senderId: userId,
        content: content || '',
        messageType: (messageType as MessageType) || 'TEXT',
        mediaUrl: imageUrl || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const formattedMessage = {
      id: message.id,
      jobId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      imageUrl: message.mediaUrl,
      createdAt: message.createdAt,
      sender: message.sender,
    };

    // Broadcast via Socket.io
    try {
      getIO().to(`chat:${jobId}`).emit('chat:message', formattedMessage);
      if (receiverId) {
        getIO().to(`user:${receiverId}`).emit('chat:newMessage', {
          jobId,
          message: formattedMessage,
        });
      }
    } catch (e) {}

    // Push notification to receiver
    if (receiverId) {
      try {
        await createAndPushNotification({
          userId: receiverId,
          type: 'NEW_MESSAGE',
          title: `New message from ${message.sender.name}`,
          body: messageType === 'IMAGE' ? '📷 Sent a photo' : content.substring(0, 100),
          data: { jobId, messageId: message.id },
        });
      } catch (e) {}
    }

    res.status(201).json({ success: true, data: formattedMessage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/chat/:jobId/read — mark messages as read ──
router.patch('/:jobId/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.jobId as string;

    const room = await prisma.chatRoom.findUnique({
      where: { jobId },
    });

    if (room) {
      await prisma.chatRoomMember.update({
        where: {
          chatRoomId_userId: {
            chatRoomId: room.id,
            userId,
          },
        },
        data: { lastReadAt: new Date() },
      });

      // Notify sender that messages were read
      try {
        getIO().to(`chat:${jobId}`).emit('chat:read', { jobId, readBy: userId });
      } catch (e) {}
    }

    res.json({ success: true, data: { message: 'Messages marked as read' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
