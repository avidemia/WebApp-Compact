import BookContentModel from '../models/BookContent_M.js';
import { extractRequestData } from '../helpers/static/request-response.js';
import Chapter from '../schema/Book/Chapter.js';
import Response from '../helpers/Response.js';

export default class ChapterController {
  /* --------------------------------- Chapter -------------------------------- */

  static async addChapter(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookContentModel.addChapter(reqData);
    return res.status(response.code).json(response);
  }

  /* ------------------------------- Upload Zip ------------------------------- */

  static async uploadZipFile(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookContentModel.uploadZipFileImage(reqData);
    return res.status(response.code).json(response);
  }

  static async syncImages(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookContentModel.syncImages(reqData);
    return res.status(response.code).json(response);
  }

  static async uploadImages(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookContentModel.uploadImages(reqData);
    return res.status(response.code).json(response);
  }

  static async uploadContextFiles(req, res) {
    try {
      const chapter = await Chapter.findOne({
        book_slug: req.params.bookSlug,
        slug: req.params.chapterSlug
      });
      
      if (!chapter) {
        return res.status(404).json(new Response(404, 'F').custom('Chapter not found'));
      }

      const files = req.files.map(file => `/uploads/${file.path}`);
      chapter.contextFiles = [...new Set([...chapter.contextFiles, ...files])];
      await chapter.save();

      return res.status(200).json(new Response(200, 'T', { paths: files }).custom('Context files uploaded'));
    } catch (error) {
      console.error(error);
      return res.status(500).json(new Response(500, 'F').custom(error.message));
    }
  }

  static async associateContextFiles(req, res) {
    try {
      const { chapterId } = req.params;
      const { files } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json(new Response(400, 'F').custom('Files array is required'));
      }
      
      const chapter = await Chapter.findById(chapterId);
      
      if (!chapter) {
        return res.status(404).json(new Response(404, 'F').custom('Chapter not found'));
      }
      
      chapter.contextFiles = [...new Set([...chapter.contextFiles, ...files])];
      await chapter.save();
      
      return res.status(200).json(new Response(200, 'T', chapter.contextFiles).custom('Context files associated with chapter'));
    } catch (error) {
      console.error('Error associating context files:', error);
      return res.status(500).json(new Response(500, 'F').custom(error.message));
    }
  }
}
