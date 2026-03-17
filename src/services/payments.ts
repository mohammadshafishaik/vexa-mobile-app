import api from './api';
import { Payment, ApiResponse } from '../types';

export const paymentService = {
  /**
   * Initiate a payment order via Razorpay
   * Returns order details (orderId, amount, currency, key)
   */
  initiatePayment: async (jobId: string): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }> => {
    const response = await api.post<
      ApiResponse<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }>
    >(`/payments/initiate`, { jobId });
    return response.data.data;
  },

  /**
   * Verify payment on server after Razorpay checkout
   * Server validates razorpay_signature to ensure authenticity
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
   * Get payment history
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
};
