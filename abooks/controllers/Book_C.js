import { extractRequestData } from '../helpers/static/request-response.js';
import BookModel from '../models/Book_M.js';

class BookController {
  static async addBook(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookModel.addBook(reqData);
    return res.status(response.code).json(response);
  }

  static async listBook(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookModel.listBook(reqData);
    return res.status(response.code).json(response);
  }

  static async updateBook(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookModel.updateBook(reqData);
    return res.status(response.code).json(response);
  }

  static async updateBookStatus(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookModel.updateBook(reqData);
    return res.status(response.code).json(response);
  }

  static async deleteBook(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookModel.deleteBook(reqData);
    return res.status(response.code).json(response);
  }

  static async listCategoryBooks(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookModel.listCategoryBooks(reqData);
    return res.status(response.code).json(response);
  }

  static async updateBookSequence(req, res) {
    const reqData = extractRequestData(req);
    const response = await BookModel.updateBookSequence(reqData);
    return res.status(response.code).json(response);
  }
}

export default BookController;
