import api from './api';
import { Payment, ApiResponse } from '../types';

export const paymentService = {
  /**
   * Create a real Razorpay order via backend
   * Returns orderId, amount (in paise), currency, and the Razorpay keyId
   */
  createOrder: async (jobId: string): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    jobTitle: string;
  }> => {
    const response = await api.post<
      ApiResponse<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        jobTitle: string;
      }>
    >('/payments/create-order', { jobId });
    return response.data.data;
  },

  /**
   * Verify payment on server after Razorpay checkout
   * Server validates razorpay_signature cryptographically
   */
  verifyPayment: async (data: {
    jobId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<Payment> => {
    const response = await api.post<ApiResponse<Payment>>(
      '/payments/verify',
      data,
    );
    return response.data.data;
  },

  /**
   * Get payment details for a job
   */
  getPaymentForJob: async (jobId: string): Promise<Payment> => {
    const response = await api.get<ApiResponse<Payment>>(
      `/payments/job/${jobId}`,
    );
    return response.data.data;
  },

  /**
   * Get payment history for authenticated user
   */
  getPaymentHistory: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<Payment[]> => {
    const response = await api.get<ApiResponse<Payment[]>>('/payments/history', {
      params,
    });
    return response.data.data;
  },

  /**
   * Pay with cash — instant completion, no Razorpay
   */
  payCash: async (jobId: string): Promise<Payment> => {
    const response = await api.post<ApiResponse<Payment>>(
      '/payments/cash',
      { jobId },
    );
    return response.data.data;
  },
};
