import api from './api';
import { ProviderLocationData } from '../types';

export const locationService = {
  // Provider sends location update
  updateLocation: async (data: {
    latitude: number;
    longitude: number;
    jobId?: string;
  }): Promise<void> => {
    await api.post('/location/update', data);
  },

  // Customer gets provider location for a job
  getProviderLocation: async (jobId: string): Promise<ProviderLocationData> => {
    const response = await api.get(`/location/job/${jobId}`);
    return response.data.data;
  },
};
