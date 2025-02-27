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

  uploadAiContextFile: async ({ bookSlug, chapterSlug, header1Slug, header2Slug, header3Slug, data }) => {
    try {
      // URL should match the storage path structure
      const url = `/api/ai-context/${bookSlug}/${chapterSlug}`;

      console.log('Making file upload request to:', url);
      console.log('Expected storage path:', `uploads/ai-context/${bookSlug}/${chapterSlug}/{filename}`);
      
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

      console.log('Raw upload response:', response);
      
      // Check if the response indicates where the file was saved
      if (response.data?.path) {
        console.log('File saved to:', response.data.path);
      }
      
      return response;
    } catch (error) {
      console.error('Upload service error:', {
        error: error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      throw error;
    }
  },

  deleteAiContextFile: async ({ bookSlug, chapterSlug, header1Slug, header2Slug, header3Slug, filePath }) => {
    try {
      const url = `/api/ai-context/${bookSlug}/${chapterSlug}/${filePath}`;
      return await DataService.delete(url);
    } catch (error) {
      console.error('Delete file error:', {
        error: error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }
};

export default authorChapterServices;
