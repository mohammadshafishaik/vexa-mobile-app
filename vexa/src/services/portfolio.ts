import api from './api';
import { PortfolioItem } from '../types';

export const portfolioService = {
  // Get a provider's portfolio
  getPortfolio: async (providerId: string): Promise<PortfolioItem[]> => {
    const response = await api.get(`/portfolio/${providerId}`);
    return response.data.data;
  },

  // Add a portfolio item
  addItem: async (data: {
    title: string;
    description?: string;
    imageUrl: string;
    category?: string;
  }): Promise<PortfolioItem> => {
    const response = await api.post('/portfolio', data);
    return response.data.data;
  },

  // Remove a portfolio item
  removeItem: async (itemId: string): Promise<void> => {
    await api.delete(`/portfolio/${itemId}`);
  },
};
