import api from './api';
import {
  BidRecommendation,
  ChatRecommendation,
  JobDescriptionRecommendation,
} from '../types';

export const recommendationService = {
  suggestJobDescription: async (payload: {
    title?: string;
    description?: string;
    category?: string;
    location?: string;
    budget?: number;
    urgency?: string;
  }): Promise<JobDescriptionRecommendation> => {
    const response = await api.post('/recommendations/job-description', payload);
    return response.data.data;
  },

  suggestBid: async (payload: {
    jobTitle?: string;
    jobDescription?: string;
    jobCategory?: string;
    currentLowestBid?: number;
    myBidAmount?: number;
    estimatedDuration?: string;
    message?: string;
    providerExperienceYears?: number;
  }): Promise<BidRecommendation> => {
    const response = await api.post('/recommendations/bid', payload);
    return response.data.data;
  },

  suggestChatReplies: async (payload: {
    latestMessage?: string;
    jobTitle?: string;
    draft?: string;
    jobStatus?: string;
  }): Promise<ChatRecommendation> => {
    const response = await api.post('/recommendations/chat', payload);
    return response.data.data;
  },
};
