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

  // AI context file operations
  uploadAiContextFile: async ({ bookSlug, chapterSlug, data }) => {
    try {
      const url = `/ai/ai-context/${bookSlug}/${chapterSlug}`;
      
      console.log('Making file upload request to:', url);
      
      // Log the FormData contents
      if (data instanceof FormData) {
        console.log('FormData contents:');
        for (let pair of data.entries()) {
          console.log(pair[0], pair[1], 'type:', pair[1].type, 'size:', pair[1].size);
        }
      }
      
      const response = await DataService.post(url, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('File upload response:', response);
      
      // Check if we have a valid response
      if (!response || response.code !== 200 || !response.data) {
        throw new Error('File upload failed: Server did not return file paths');
      }
      
      return response;
    } catch (error) {
      console.error('Upload service error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  deleteAiContextFile: async ({ bookSlug, chapterSlug, fileId }) => {
    try {
      const url = `/ai/ai-context/${bookSlug}/${chapterSlug}/${fileId}`;
      return await DataService.delete(url);
    } catch (error) {
      console.error('Delete file error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }
};

export default authorChapterServices;