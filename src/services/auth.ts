import api from './api';
import { User, LoginResponse, ApiResponse } from '../types';

export const authService = {
  /**
   * Login with Google OAuth token
   * Backend validates Google token and returns JWT + user
   */
  loginWithGoogle: async (idToken: string): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/auth/google',
      { idToken },
    );
    return response.data.data;
  },

  /**
   * Register a new user (role selection after Google auth)
   */
  completeRegistration: async (data: {
    role: 'CUSTOMER' | 'PROVIDER';
    name: string;
    phone?: string;
  }): Promise<User> => {
    const response = await api.post<ApiResponse<User>>(
      '/auth/register/complete',
      data,
    );
    return response.data.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/auth/refresh',
      { refreshToken },
    );
    return response.data.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/auth/profile');
    return response.data.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<ApiResponse<User>>('/auth/profile', data);
    return response.data.data;
  },

  /**
   * Logout — invalidate refresh token
   */
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};
