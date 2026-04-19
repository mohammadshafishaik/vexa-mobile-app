import api from './api';
import { ProviderAvailabilitySlot, ProviderAvailabilityStatus } from '../types';

export const availabilityService = {
  // Get my availability
  getMyAvailability: async (): Promise<{
    status: ProviderAvailabilityStatus;
    slots: ProviderAvailabilitySlot[];
  }> => {
    const response = await api.get('/availability/my');
    return response.data.data;
  },

  // Set weekly availability slots
  setAvailability: async (slots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isBlocked?: boolean;
  }[]): Promise<ProviderAvailabilitySlot[]> => {
    const response = await api.put('/availability', { slots });
    return response.data.data;
  },

  // Toggle online/offline status
  setStatus: async (status: ProviderAvailabilityStatus): Promise<void> => {
    await api.patch('/availability/status', { status });
  },

  // Block a specific day
  blockDay: async (dayOfWeek: number): Promise<ProviderAvailabilitySlot> => {
    const response = await api.post('/availability/block', { dayOfWeek });
    return response.data.data;
  },

  // Get a provider's availability
  getProviderAvailability: async (providerId: string): Promise<{
    status: ProviderAvailabilityStatus;
    slots: ProviderAvailabilitySlot[];
  }> => {
    const response = await api.get(`/availability/provider/${providerId}`);
    return response.data.data;
  },
};
