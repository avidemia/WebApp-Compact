import BookContentModel from '../models/BookContent_M.js';
import { extractRequestData } from '../helpers/static/request-response.js';

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
}
