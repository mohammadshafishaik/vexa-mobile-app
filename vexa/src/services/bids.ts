import api from './api';
import { Bid, ApiResponse, PaginatedResponse } from '../types';

export const bidService = {
  /**
   * Place a new bid on a job
   */
  placeBid: async (data: {
    jobId: string;
    amount: number;
    message: string;
    estimatedDuration: string;
  }): Promise<Bid> => {
    const response = await api.post<ApiResponse<Bid>>('/bids', data);
    return response.data.data;
  },

  /**
   * Get all bids for a specific job
   */
  getBidsForJob: async (
    jobId: string,
    params?: { page?: number; limit?: number },
  ): Promise<Bid[]> => {
    const response = await api.get<ApiResponse<Bid[]>>(
      `/bids/job/${jobId}`,
      { params },
    );
    return response.data.data ?? [];
  },

  /**
   * Get my bids as a provider
   */
  getMyBids: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Bid>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Bid>>>(
      '/bids/my',
      { params },
    );
    return response.data.data;
  },

  /**
   * Update a bid (only before acceptance)
   */
  updateBid: async (
    bidId: string,
    data: { amount?: number; message?: string; estimatedDuration?: string },
  ): Promise<Bid> => {
    const response = await api.put<ApiResponse<Bid>>(`/bids/${bidId}`, data);
    return response.data.data;
  },

  /**
   * Withdraw a bid
   */
  withdrawBid: async (bidId: string): Promise<void> => {
    await api.delete(`/bids/${bidId}`);
  },
};
