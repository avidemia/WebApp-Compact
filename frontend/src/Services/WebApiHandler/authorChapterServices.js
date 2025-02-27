import { DataService } from '../dataService';

const authorChapterServices = {
  createChapterApi: (data) => {
    return DataService.post('author/chapter', data);
  },
  updateChapterApi: (id, data) => {
    return DataService.put(`author/chapter/${id}`, data);
  },
  deleteChapterApi: (id, data) => {
    return DataService.delete(`author/chapter/${id}`, data);
  },
  uploadZipHander: (data) => {
    return DataService.post(`book/zip-file`, data);
  },
  uploadImageAPIzip: (data) => {
    return DataService.get(`book/sync-images?book_id=${data?.book_id}`);
  },

  // api for breadcrumb 
  getChapterSlug: (id) => {
    return DataService.get(`static/slug/chapters/${id}`);
  },
  getHeaderOneSlug: (id) => {
    return DataService.get(`static/slug/header-1/${id}`);
  },
  getHeaderTwoSlug: (id) => {
    return DataService.get(`static/slug/header-2/${id}`);
  },
  getHeaderThreeSlug: (id) => {
    return DataService.get(`static/slug/header-3/${id}`);
  },

  // AI Context File Methods
  uploadAiContextFile: async ({ bookSlug, chapterSlug, data }) => {
    try {
      return await DataService.post(`api/author/ai-context/${bookSlug}/${chapterSlug}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      console.error('Upload context file error:', error);
      throw error;
    }
  },

  getAiContextFiles: async ({ bookSlug, chapterSlug }) => {
    try {
      return await DataService.get(`api/author/ai-context/${bookSlug}/${chapterSlug}`);
    } catch (error) {
      console.error('Get context files error:', error);
      throw error;
    }
  },

  deleteAiContextFile: async ({ bookSlug, chapterSlug, filePath }) => {
    try {
      return await DataService.delete(`api/author/ai-context/${bookSlug}/${chapterSlug}/${filePath}`);
    } catch (error) {
      console.error('Delete context file error:', error);
      throw error;
    }
  }
};

export default authorChapterServices;