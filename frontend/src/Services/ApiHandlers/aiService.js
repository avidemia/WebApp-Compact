import { DataService } from '../dataService';

export const aiService = {
  askQuestion: async (data) => {
    try {
      const response = await DataService.post('/ai/question', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  askQuestionWithData: async (data) => {
    try {
      const response = await DataService.post('/ai/question/data', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getContextFiles: async ({ bookSlug, chapterSlug }) => {
    try {
      if (!bookSlug || !chapterSlug) {
        throw new Error('bookSlug and chapterSlug are required');
      }
      
      const response = await DataService.get(`/ai/ai-context/${bookSlug}/${chapterSlug}`);
      return response;
    } catch (error) {
      console.error('Error getting context files:', error);
      throw error;
    }
  },
};