import api from './api';
import { ChatMessage, ChatConversation } from '../types';

export const chatService = {
  // Get all conversations for the current user
  getConversations: async (): Promise<ChatConversation[]> => {
    const response = await api.get('/chat/conversations');
    return response.data.data;
  },

  // Get messages for a specific job
  getMessages: async (jobId: string, page = 1, limit = 50): Promise<{
    data: ChatMessage[];
    total: number;
    hasMore: boolean;
  }> => {
    const response = await api.get(`/chat/${jobId}`, { params: { page, limit } });
    return response.data;
  },

  // Send a message
  sendMessage: async (jobId: string, data: {
    content: string;
    messageType?: string;
    imageUrl?: string;
  }): Promise<ChatMessage> => {
    const response = await api.post(`/chat/${jobId}`, data);
    return response.data.data;
  },

  // Mark messages as read
  markAsRead: async (jobId: string): Promise<void> => {
    await api.patch(`/chat/${jobId}/read`);
  },
};
