import api from './api';
import { User, LoginResponse, ApiResponse } from '../types';

export const authService = {
  /**
   * Login with email and password
   */
  loginWithEmail: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/custom-auth/login',
      { email, password },
    );
    return response.data.data;
  },

  /**
   * Send a one-time login code to the user's email address
   */
  sendLoginOtp: async (email: string, captchaToken: string): Promise<{ message: string }> => {
    const response = await api.post('/custom-auth/otp/send', { email, captchaToken });
    return response.data;
  },

  /**
   * Get SVG captcha image from backend
   */
  getCaptchaImage: async (): Promise<{ id: string; svg: string }> => {
    const response = await api.get<ApiResponse<{ id: string; svg: string }>>(
      '/custom-auth/captcha-image',
    );
    return response.data.data;
  },

  /**
   * Verify a one-time login code and return authenticated session tokens
   */
  verifyLoginOtp: async (email: string, otp: string): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/custom-auth/otp/verify',
      { email, otp },
    );
    return response.data.data;
  },

  /**
   * Login with Google OAuth token
   */
  loginWithGoogle: async (data: {
    idToken?: string;
    email: string;
    name: string;
    photoUrl?: string;
    googleId: string;
  }): Promise<LoginResponse & { isNewUser?: boolean }> => {
    const response = await api.post<ApiResponse<LoginResponse & { isNewUser?: boolean }>>(
      '/custom-auth/google',
      data,
    );
    return response.data.data;
  },

  /**
   * Register a new user
   */
  register: async (data: {
    email: string;
    name: string;
    password: string;
    phone?: string;
    role: 'CUSTOMER' | 'PROVIDER';
    initialSkills?: string[];
  }): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/custom-auth/register',
      data,
    );
    return response.data.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/custom-auth/refresh',
      { refreshToken },
    );
    return response.data.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/custom-auth/profile');
    return response.data.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<ApiResponse<User>>('/custom-auth/profile', data);
    return response.data.data;
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.put('/custom-auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Forgot password — request reset token
   */
  forgotPassword: async (email: string): Promise<{ resetToken?: string }> => {
    const response = await api.post('/custom-auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/custom-auth/reset-password', { token, password });
  },

  /**
   * Get user stats (job count, avg rating, review count)
   */
  getStats: async (): Promise<{
    jobCount: number;
    avgRating: number;
    reviewCount: number;
  }> => {
    const response = await api.get('/custom-auth/stats');
    return response.data.data;
  },

  /**
   * Logout — clear session
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/custom-auth/logout');
    } catch {
      // Ignore logout errors
    }
  },
};
