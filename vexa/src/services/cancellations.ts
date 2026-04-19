import api from './api';
import { Cancellation, ServiceRequest } from '../types';

export const cancellationService = {
  // Cancel a job
  cancelJob: async (jobId: string, reason: string): Promise<{
    cancellation: Cancellation;
    job: ServiceRequest;
    feeApplied: number;
    ratingPenalty: boolean;
  }> => {
    const response = await api.post(`/cancellations/${jobId}`, { reason });
    return response.data.data;
  },

  // Get cancellation details for a job
  getCancellation: async (jobId: string): Promise<Cancellation> => {
    const response = await api.get(`/cancellations/${jobId}`);
    return response.data.data;
  },

  // Get my cancellation history
  getHistory: async (page = 1, limit = 20): Promise<{
    data: Cancellation[];
    total: number;
    hasMore: boolean;
  }> => {
    const response = await api.get('/cancellations/history/my', { params: { page, limit } });
    return response.data;
  },
};
