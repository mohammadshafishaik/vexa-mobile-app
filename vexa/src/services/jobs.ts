import api from './api';
import {
  ServiceRequest,
  ApiResponse,
  PaginatedResponse,
  JobModification,
  Rating,
} from '../types';

export const jobService = {
  createJob: async (data: {
    title: string;
    description: string;
    category: string;
    location: string;
    latitude?: number;
    longitude?: number;
    images?: string[];
    originalPrice?: number;
    urgency?: string;
    scheduledAt?: string;
  }): Promise<ServiceRequest> => {
    const response = await api.post<ApiResponse<ServiceRequest>>('/jobs', data);
    return response.data.data;
  },

  getJobs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  }): Promise<PaginatedResponse<ServiceRequest>> => {
    const response = await api.get<any>('/jobs', { params });
    const raw = response.data;
    if (raw.data && Array.isArray(raw.data)) {
      return { data: raw.data, total: raw.total, page: raw.page, limit: raw.limit, hasMore: raw.hasMore };
    }
    return raw.data;
  },

  getJobById: async (jobId: string): Promise<ServiceRequest> => {
    const response = await api.get<ApiResponse<ServiceRequest>>(`/jobs/${jobId}`);
    return response.data.data;
  },

  updateJobStatus: async (jobId: string, status: string): Promise<ServiceRequest> => {
    const response = await api.patch<ApiResponse<ServiceRequest>>(
      `/jobs/${jobId}/status`,
      { status },
    );
    return response.data.data;
  },

  // Correct route: POST /api/bids/:bidId/accept
  acceptBid: async (jobId: string, bidId: string): Promise<ServiceRequest> => {
    const response = await api.post<ApiResponse<ServiceRequest>>(`/bids/${bidId}/accept`);
    return response.data.data;
  },

  completeJob: async (jobId: string, completedImages?: string[]): Promise<ServiceRequest> => {
    const response = await api.patch<ApiResponse<ServiceRequest>>(
      `/jobs/${jobId}/complete`,
      { completedImages: completedImages || [] },
    );
    return response.data.data;
  },

  acceptWork: async (jobId: string): Promise<ServiceRequest> => {
    const response = await api.patch<ApiResponse<ServiceRequest>>(`/jobs/${jobId}/accept-work`);
    return response.data.data;
  },

  // Correct route: POST /api/modifications
  submitModification: async (
    jobId: string,
    data: { revisionReason: string; revisedPrice: number; revisionImages?: string[] },
  ): Promise<JobModification> => {
    const response = await api.post<ApiResponse<JobModification>>('/modifications', { jobId, ...data });
    return response.data.data;
  },

  // Correct route: PATCH /api/modifications/:id
  respondToModification: async (
    jobId: string,
    modificationId: string,
    data: { approved: boolean; customerResponse?: string },
  ): Promise<JobModification> => {
    const response = await api.patch<ApiResponse<JobModification>>(
      `/modifications/${modificationId}`,
      { approvalStatus: data.approved ? 'APPROVED' : 'REJECTED', customerResponse: data.customerResponse },
    );
    return response.data.data;
  },

  submitRating: async (
    jobId: string,
    data: { rateeId: string; score: number; review: string },
  ): Promise<Rating> => {
    const response = await api.post<ApiResponse<Rating>>('/ratings', { jobId, ...data });
    return response.data.data;
  },

  // Uses GET /api/jobs — backend filters by role automatically
  getMyJobs: async (params?: { page?: number; limit?: number; status?: string }): Promise<PaginatedResponse<ServiceRequest>> => {
    const response = await api.get<any>('/jobs', { params });
    const raw = response.data;
    if (raw.data && Array.isArray(raw.data)) {
      return { data: raw.data, total: raw.total, page: raw.page, limit: raw.limit, hasMore: raw.hasMore };
    }
    return raw.data;
  },
};
