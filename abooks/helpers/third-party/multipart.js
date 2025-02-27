/* eslint-disable no-useless-escape */
import { ensureDirSync } from 'fs-extra';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/* -------------------------------------------------------------------------- */
/*                                   Multer                                   */
/* -------------------------------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/csv');
  },

  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents');
  },

  filename: (req, file, cb) => {
    const fileNameCheck = file.originalname.replace(
      /[-&\/\\#.,+()$~%'":*?<>{} ]/g,
      '',
    );
    cb(
      null,
      `${fileNameCheck}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

const upload = multer({
  storage,
});

const uploadDocument = multer({
  storage: documentStorage,
});

function uploadFiles(folder) {
  ensureDirSync(path.join(path.resolve(), folder));
  const Storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, folder);
    },

    filename: (req, file, cb) => {
      const fileNameCheck = file.originalname.replace(
        /[-&\/\\#.,+()$~%'":*?<>{} ]/g,
        '',
      );
      cb(
        null,
        `${fileNameCheck}-${Date.now()}${path.extname(file.originalname)}`,
      );
    },
  });

  return multer({ storage: Storage });
}

const storageCK = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/blog');
  },
  filename: function (req, file, cb) {
    let ext = file.originalname.split('.');
    ext = ext[ext.length - 1];
    cb(null, `${Date.now()}.${ext}`);
  },
});

const uploadCK = multer({ storage: storageCK });

function uploadAiContext(fieldName) {
  const baseDir = 'uploads/ai-context';
  
  console.log('Initializing uploadAiContext middleware:', {
    fieldName,
    baseDir,
    cwd: process.cwd()
  });
  
  const aiContextStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Get book and chapter slugs from request
      const { bookSlug, chapterSlug } = req.params;
      
      console.log('File Upload Request:', {
        params: req.params,
        bookSlug,
        chapterSlug,
        fieldName,
        file: {
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          size: file.size
        }
      });
      
      if (!bookSlug || !chapterSlug) {
        console.error('Missing slugs:', { bookSlug, chapterSlug });
        return cb(new Error('Missing bookSlug or chapterSlug in request params'));
      }

      // Create nested directory structure
      const uploadDir = path.join(baseDir, bookSlug, chapterSlug);
      const absoluteUploadDir = path.join(process.cwd(), uploadDir);
      
      console.log('Creating upload directory:', {
        baseDir,
        uploadDir,
        absoluteUploadDir,
        exists: fs.existsSync(absoluteUploadDir)
      });

      try {
        ensureDirSync(absoluteUploadDir);
        
        console.log('Directory created/verified:', {
          path: absoluteUploadDir,
          exists: fs.existsSync(absoluteUploadDir),
          isDirectory: fs.statSync(absoluteUploadDir).isDirectory(),
          permissions: fs.statSync(absoluteUploadDir).mode.toString(8)
        });
        
        cb(null, uploadDir);
      } catch (error) {
        console.error('Error creating directory:', {
          error,
          message: error.message,
          stack: error.stack
        });
        cb(error);
      }
    },

    filename: (req, file, cb) => {
      const fileNameCheck = file.originalname.replace(
        /[-&\/\\#.,+()$~%'":*?<>{} ]/g,
        '',
      );
      // Add UUID for better uniqueness
      const uuid = require('uuid').v4().split('-')[0];
      const finalName = `${fileNameCheck}-${Date.now()}-${uuid}${path.extname(file.originalname)}`;
      
      console.log('Generated filename:', {
        original: file.originalname,
        sanitized: fileNameCheck,
        final: finalName
      });
      
      cb(null, finalName);
    },
  });

  const upload = multer({
    storage: aiContextStorage,
    limits: {
      fileSize: 400 * 1024 * 1024, // 400MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['.txt', '.md', '.tex'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      console.log('File filter check:', {
        filename: file.originalname,
        extension: ext,
        allowed: allowedTypes.includes(ext)
      });
      
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only .txt, .md, and .tex files are allowed.'));
      }
    }
  });

  console.log('Created multer upload middleware');
  return upload.array(fieldName, 10);
}

export { upload, uploadCK, uploadDocument, uploadFiles, uploadAiContext };
