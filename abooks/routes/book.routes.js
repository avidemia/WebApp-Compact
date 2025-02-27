import express from 'express';

import BookCategoryController from '../controllers/Admin/BookCategory_C.js';
import BookController from '../controllers/Book_C.js';
import BookCloneController from '../controllers/BookClone_C.js';
import BookContent from '../controllers/BookContent_C.js';

import { verifyJwt } from '../helpers/middleware/authentication.js';
import {
  checkIfAdmin,
  checkIfAuthor,
  checkIfAuthorOrInstructor,
} from '../helpers/middleware/custom.js';
import { uploadFiles, uploadAiContext } from '../helpers/third-party/multipart.js';
import VALIDATE from '../helpers/validations/index.js';

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                                Book Category                               */
/* -------------------------------------------------------------------------- */

router
  .route('/category/:id?')
  .post(verifyJwt, VALIDATE, BookCategoryController.addBookCategory)
  .get(verifyJwt, BookCategoryController.listBookCategory)
  .put(verifyJwt, VALIDATE, BookCategoryController.updateBookCategory)
  .delete(verifyJwt, BookCategoryController.deleteCategory);

/* -------------------------------------------------------------------------- */
/*                                      Book                                  */
/* -------------------------------------------------------------------------- */
router
  .route('/manage/:id?')
  .post(
    verifyJwt,
    checkIfAdmin,
    uploadFiles('uploads/books').single('book_image'),
    BookController.addBook,
  )
  .get(verifyJwt, BookController.listBook)
  .put(
    verifyJwt,
    checkIfAdmin,
    uploadFiles('uploads/books').single('book_image'),
    BookController.updateBook,
  )
  .patch(verifyJwt, checkIfAdmin, BookController.updateBookStatus)
  .delete(verifyJwt, checkIfAdmin, BookController.deleteBook);

router.get(
  '/category-books/:id',
  verifyJwt,
  checkIfAdmin,
  BookController.listCategoryBooks,
);
router.post(
  '/update-positions',
  verifyJwt,
  checkIfAdmin,
  BookController.updateBookSequence,
);

/* -------------------------------------------------------------------------- */
/*                                 Book Clone                                 */
/* -------------------------------------------------------------------------- */
router
  .route('/manage-clone/:id?')
  .get(verifyJwt, BookCloneController.cloneBookList)
  .delete(verifyJwt, checkIfAdmin, BookCloneController.deleteCloneBook);

/* -------------------------------------------------------------------------- */
/*                                   Chapter                                  */
/* -------------------------------------------------------------------------- */

router
  .route('/chapter/:id?')
  .post(
    verifyJwt,
    uploadFiles('uploads/chapter').array('chapter_image'),
    BookContent.addChapter,
  );

/* ----------------------- Upload Zip and Sync Images ------------------------ */
router.post(
  '/upload-context-files/:bookSlug/:chapterSlug',
  uploadAiContext('contextFiles'),
  verifyJwt,
  checkIfAuthorOrInstructor,
  BookContent.uploadContextFiles
);

router.patch(
  '/chapter/:chapterId/context-files',
  verifyJwt,
  checkIfAuthorOrInstructor,
  BookContent.associateContextFiles
);

router.post(
  '/zip-file',
  uploadFiles('uploads/temp').single('zip_file'),
  verifyJwt,
  checkIfAuthor,
  BookContent.uploadZipFile,
);

router.get('/sync-images', verifyJwt, checkIfAuthor, BookContent.syncImages);

router.post(
  '/upload-images',
  uploadFiles('uploads/book-images').single('image'),
  verifyJwt,
  checkIfAuthorOrInstructor,
  BookContent.uploadImages,
);

export default router;
