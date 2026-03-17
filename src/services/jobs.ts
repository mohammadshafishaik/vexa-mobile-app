import api from './api';
import {
  ServiceRequest,
  ApiResponse,
  PaginatedResponse,
  JobModification,
  Rating,
} from '../types';

export const jobService = {
  /**
   * Create a new service request (job)
   */
  createJob: async (data: {
    title: string;
    description: string;
    category: string;
    location: string;
    latitude?: number;
    longitude?: number;
    images?: string[];
    originalPrice: number;
  }): Promise<ServiceRequest> => {
    const response = await api.post<ApiResponse<ServiceRequest>>('/jobs', data);
    return response.data.data;
  },

  /**
   * Get paginated list of jobs
   */
  getJobs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  }): Promise<PaginatedResponse<ServiceRequest>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<ServiceRequest>>>(
      '/jobs',
      { params },
    );
    return response.data.data;
  },

  /**
   * Get a single job by ID
   */
  getJobById: async (jobId: string): Promise<ServiceRequest> => {
    const response = await api.get<ApiResponse<ServiceRequest>>(`/jobs/${jobId}`);
    return response.data.data;
  },

  /**
   * Update job status (backend enforces valid transitions)
   */
  updateJobStatus: async (
    jobId: string,
    status: string,
  ): Promise<ServiceRequest> => {
    const response = await api.patch<ApiResponse<ServiceRequest>>(
      `/jobs/${jobId}/status`,
      { status },
    );
    return response.data.data;
  },

  /**
   * Accept a bid for a job
   */
  acceptBid: async (jobId: string, bidId: string): Promise<ServiceRequest> => {
    const response = await api.post<ApiResponse<ServiceRequest>>(
      `/jobs/${jobId}/accept-bid`,
      { bidId },
    );
    return response.data.data;
  },

  /**
   * Submit a modification request (provider)
   */
  submitModification: async (
    jobId: string,
    data: {
      revisionReason: string;
      revisedPrice: number;
      revisionImages?: string[];
    },
  ): Promise<JobModification> => {
    const response = await api.post<ApiResponse<JobModification>>(
      `/jobs/${jobId}/modifications`,
      data,
    );
    return response.data.data;
  },

  /**
   * Approve or reject a modification (customer)
   */
  respondToModification: async (
    jobId: string,
    modificationId: string,
    data: {
      approved: boolean;
      customerResponse?: string;
    },
  ): Promise<JobModification> => {
    const response = await api.put<ApiResponse<JobModification>>(
      `/jobs/${jobId}/modifications/${modificationId}`,
      data,
    );
    return response.data.data;
  },

  /**
   * Submit a rating for a completed job
   */
  submitRating: async (
    jobId: string,
    data: { score: number; review: string },
  ): Promise<Rating> => {
    const response = await api.post<ApiResponse<Rating>>(
      `/jobs/${jobId}/ratings`,
      data,
    );
    return response.data.data;
  },

  /**
   * Get my jobs (as customer or provider)
   */
  getMyJobs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<ServiceRequest>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<ServiceRequest>>>(
      '/jobs/my',
      { params },
    );
    return response.data.data;
  },
};
