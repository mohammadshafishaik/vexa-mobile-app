import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { SOCKET_EVENTS } from '../utils/constants';

// ─── Match the same production/dev toggle as api.ts ─────────────
const USE_PRODUCTION = true;

const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const SOCKET_URL = USE_PRODUCTION
  ? 'https://vexa-backend-hx9v.onrender.com'
  : `http://${HOST}:3000`;

let socket: Socket | null = null;

export const socketService = {
  /**
   * Connect to the Socket.io server with JWT authentication
   * Auto-joins user room and sets up notification listener
   */
  connect: (): Socket => {
    const tokens = useAuthStore.getState().tokens;
    const user = useAuthStore.getState().user;

    // Disconnect existing connection
    if (socket?.connected) {
      socket.disconnect();
    }

    socket = io(SOCKET_URL, {
      auth: {
        token: tokens?.accessToken,
      },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('[Socket] Connected:', socket?.id);

      // Auto-join user room for notifications
      if (user?.id) {
        socket?.emit(SOCKET_EVENTS.USER_JOIN, user.id);
        console.log('[Socket] Auto-joined user room:', user.id);
      }
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('[Socket] Error:', error);
    });

    // Auto-rejoin rooms on reconnect
    socket.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id) {
        socket?.emit(SOCKET_EVENTS.USER_JOIN, currentUser.id);
      }
    });

    // Listen for real-time notifications
    socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, (notification) => {
      console.log('[Socket] New notification:', notification.title);
      useNotificationStore.getState().addNotification(notification);
    });

    return socket;
  },

  /**
   * Disconnect from the server
   */
  disconnect: (): void => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  },

  /**
   * Get the current socket instance
   */
  getSocket: (): Socket | null => socket,

  /**
   * Check if socket is connected
   */
  isConnected: (): boolean => socket?.connected ?? false,

  /**
   * Join a bidding room for live bid updates
   */
  joinBiddingRoom: (jobId: string): void => {
    socket?.emit(SOCKET_EVENTS.JOIN_BIDDING_ROOM, jobId);
  },

  /**
   * Leave a bidding room
   */
  leaveBiddingRoom: (jobId: string): void => {
    socket?.emit(SOCKET_EVENTS.LEAVE_BIDDING_ROOM, jobId);
  },

  /**
   * Listen for new bids in real-time
   */
  onNewBid: (callback: (bid: unknown) => void): void => {
    socket?.on(SOCKET_EVENTS.NEW_BID, callback);
  },

  /**
   * Listen for bid updates
   */
  onBidUpdate: (callback: (bid: unknown) => void): void => {
    socket?.on(SOCKET_EVENTS.BID_UPDATE, callback);
  },

  /**
   * Listen for job status changes
   */
  onJobStatusChange: (
    callback: (data: { jobId: string; status: string }) => void,
  ): void => {
    socket?.on(SOCKET_EVENTS.JOB_STATUS_CHANGE, callback);
  },

  /**
   * Listen for modification submissions
   */
  onModificationSubmitted: (callback: (data: unknown) => void): void => {
    socket?.on(SOCKET_EVENTS.MODIFICATION_SUBMITTED, callback);
  },

  /**
   * Listen for new notifications
   */
  onNewNotification: (callback: (notification: unknown) => void): void => {
    socket?.on(SOCKET_EVENTS.NEW_NOTIFICATION, callback);
  },

  /**
   * Remove a specific event listener
   */
  off: (event: string): void => {
    socket?.off(event);
  },

  /**
   * Remove all listeners for an event
   */
  removeAllListeners: (event?: string): void => {
    if (event) {
      socket?.removeAllListeners(event);
    } else {
      socket?.removeAllListeners();
    }
  },
};
