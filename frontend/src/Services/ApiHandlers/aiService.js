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
      const response = await DataService.get(`/api/ai-context/${bookSlug}/${chapterSlug}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};
