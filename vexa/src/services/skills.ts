import api from './api';
import { ProviderSkill } from '../types';

export const skillsService = {
  // Get available categories
  getCategories: async (): Promise<string[]> => {
    const response = await api.get('/skills/categories');
    return response.data.data;
  },

  // Get my skills
  getMySkills: async (): Promise<ProviderSkill[]> => {
    const response = await api.get('/skills/my');
    return response.data.data;
  },

  // Get a provider's skills
  getProviderSkills: async (providerId: string): Promise<ProviderSkill[]> => {
    const response = await api.get(`/skills/provider/${providerId}`);
    return response.data.data;
  },

  // Add a single skill
  addSkill: async (category: string, experienceYears: number): Promise<ProviderSkill> => {
    const response = await api.post('/skills', { category, experienceYears });
    return response.data.data;
  },

  // Set multiple skills at once
  setSkills: async (skills: { category: string; experienceYears: number }[]): Promise<ProviderSkill[]> => {
    const response = await api.post('/skills/bulk', { skills });
    return response.data.data;
  },

  // Remove a skill
  removeSkill: async (skillId: string): Promise<void> => {
    await api.delete(`/skills/${skillId}`);
  },
};
