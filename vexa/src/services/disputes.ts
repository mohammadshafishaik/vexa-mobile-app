import api from './api';
import { ApiResponse } from '../types';

export interface Dispute {
  id: string;
  jobId: string;
  raisedById: string;
  reason: string;
  evidence: string[];
  status: 'OPEN' | 'RESOLVED';
  resolution?: string;
  resolvedById?: string;
  createdAt: string;
  updatedAt: string;
  raisedBy?: { id: string; name: string; email: string };
  job?: { id: string; title: string; status: string; category: string };
}

export const disputeService = {
  /**
   * Raise a new dispute
   */
  createDispute: async (data: {
    jobId: string;
    reason: string;
    evidence?: string[];
  }): Promise<Dispute> => {
    const response = await api.post<ApiResponse<Dispute>>('/disputes', data);
    return response.data.data;
  },

  /**
   * Get disputes for the current user
   */
  getDisputes: async (): Promise<Dispute[]> => {
    const response = await api.get<ApiResponse<Dispute[]>>('/disputes');
    return response.data.data;
  },
};
