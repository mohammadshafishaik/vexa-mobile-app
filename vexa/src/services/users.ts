import api from './api';

export const userService = {
  /**
   * Register device token for push notifications
   */
  registerDeviceToken: async (deviceToken: string) => {
    const response = await api.post('/users/device-token', { deviceToken });
    return response.data;
  },

  /**
   * Remove device token (e.g., on logout)
   */
  removeDeviceToken: async (deviceToken: string) => {
    const response = await api.delete('/users/device-token', { data: { deviceToken } });
    return response.data;
  },

  /**
   * Submit KYC documents for verification
   */
  submitKYC: async (kycDocuments: string[]) => {
    const response = await api.post('/users/kyc', { kycDocuments });
    return response.data;
  },

  /**
   * Get public profile of a user
   */
  getUserProfile: async (userId: string) => {
    const response = await api.get(`/users/profile/${userId}`);
    return response.data;
  },

  /**
   * Update own profile
   */
  updateProfile: async (data: { name?: string; phone?: string; avatarUrl?: string }) => {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },
};
