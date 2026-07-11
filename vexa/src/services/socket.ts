import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { SOCKET_EVENTS } from '../utils/constants';
import { BACKEND_URL } from './api';

let socket: Socket | null = null;

export const socketService = {
  connect: (): Socket => {
    const tokens = useAuthStore.getState().tokens;
    const user = useAuthStore.getState().user;

    if (socket?.connected) {
      socket.disconnect();
    }

    socket = io(BACKEND_URL, {
      auth: { token: tokens?.accessToken },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('[Socket] Connected:', socket?.id);
      if (user?.id) {
        socket?.emit(SOCKET_EVENTS.USER_JOIN, user.id);
      }
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('[Socket] Error:', error);
    });

    socket.on('reconnect', () => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id) {
        socket?.emit(SOCKET_EVENTS.USER_JOIN, currentUser.id);
      }
    });

    socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, (notification: any) => {
      useNotificationStore.getState().addNotification(notification);
      try {
        const { Alert } = require('react-native');
        Alert.alert(
          notification.title || 'Vexa Notification',
          notification.body || '',
          [{ text: 'Dismiss', style: 'cancel' }]
        );
      } catch (e) {
        console.error('[Socket] Failed to show in-app notification:', e);
      }
    });

    return socket;
  },

  disconnect: (): void => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  },

  getSocket: (): Socket | null => socket,
  isConnected: (): boolean => socket?.connected ?? false,

  joinBiddingRoom: (jobId: string): void => {
    socket?.emit(SOCKET_EVENTS.JOIN_BIDDING_ROOM, jobId);
  },

  leaveBiddingRoom: (jobId: string): void => {
    socket?.emit(SOCKET_EVENTS.LEAVE_BIDDING_ROOM, jobId);
  },

  onNewBid: (callback: (bid: unknown) => void): void => {
    socket?.on(SOCKET_EVENTS.NEW_BID, callback);
  },

  onBidUpdate: (callback: (bid: unknown) => void): void => {
    socket?.on(SOCKET_EVENTS.BID_UPDATE, callback);
  },

  onJobStatusChange: (callback: (data: { jobId: string; status: string }) => void): void => {
    socket?.on(SOCKET_EVENTS.JOB_STATUS_CHANGE, callback);
  },

  onModificationSubmitted: (callback: (data: unknown) => void): void => {
    socket?.on(SOCKET_EVENTS.MODIFICATION_SUBMITTED, callback);
  },

  onNewNotification: (callback: (notification: unknown) => void): void => {
    socket?.on(SOCKET_EVENTS.NEW_NOTIFICATION, callback);
  },

  off: (event: string): void => {
    socket?.off(event);
  },

  removeAllListeners: (event?: string): void => {
    if (event) {
      socket?.removeAllListeners(event);
    } else {
      socket?.removeAllListeners();
    }
  },

  // ─── Chat events ─────────────────────────────
  joinChatRoom: (jobId: string): void => {
    socket?.emit('chat:join', jobId);
  },

  leaveChatRoom: (jobId: string): void => {
    socket?.emit('chat:leave', jobId);
  },

  onChatMessage: (callback: (message: unknown) => void): void => {
    socket?.on('chat:message', callback);
  },

  onChatNewMessage: (callback: (data: { jobId: string; message: unknown }) => void): void => {
    socket?.on('chat:newMessage', callback);
  },

  onChatTyping: (callback: (data: { jobId: string; userId: string; isTyping: boolean }) => void): void => {
    socket?.on('chat:typing', callback);
  },

  sendTypingIndicator: (jobId: string, userId: string, isTyping: boolean): void => {
    socket?.emit('chat:typing', { jobId, userId, isTyping });
  },

  onChatRead: (callback: (data: { jobId: string; readBy: string }) => void): void => {
    socket?.on('chat:read', callback);
  },

  sendChatMessage: (data: { jobId: string; senderId: string; content: string; messageType?: string; imageUrl?: string }): void => {
    socket?.emit('chat:sendMessage', data);
  },

  // ─── Location events ────────────────────────
  onProviderLocation: (callback: (data: {
    jobId: string;
    providerId: string;
    latitude: number;
    longitude: number;
    updatedAt: string;
  }) => void): void => {
    socket?.on('location:provider', callback);
  },

  sendLocationUpdate: (data: { jobId: string; latitude: number; longitude: number }): void => {
    socket?.emit('location:update', data);
  },
};
