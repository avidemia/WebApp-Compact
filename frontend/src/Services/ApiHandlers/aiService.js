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
      const response = await DataService.get(`/api/author/ai-context/${bookSlug}/${chapterSlug}`);
      return response;
    } catch (error) {
      console.error('Error fetching context files:', error);
      throw error;
    }
  },

  uploadContextFiles: async ({ bookSlug, chapterSlug, data }) => {
    try {
      const response = await DataService.post(`/api/author/ai-context/${bookSlug}/${chapterSlug}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    } catch (error) {
      console.error('Error uploading context files:', error);
      throw error;
    }
  },

  deleteContextFile: async ({ bookSlug, chapterSlug, fileId }) => {
    try {
      const response = await DataService.delete(`/api/author/ai-context/${bookSlug}/${chapterSlug}/${fileId}`);
      return response;
    } catch (error) {
      console.error('Error deleting context file:', error);
      throw error;
    }
  }
};