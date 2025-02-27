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
  
  const aiContextStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const { bookSlug, chapterSlug } = req.params;
      
      // Validate slugs format
      if (!/^[a-z0-9-]+$/.test(bookSlug) || !/^[a-z0-9-]+$/.test(chapterSlug)) {
        return cb(new Error('Invalid slug format. Only lowercase letters, numbers and hyphens allowed'));
      }

      const uploadDir = path.join(baseDir, bookSlug, chapterSlug);
      const absoluteUploadDir = path.join(process.cwd(), uploadDir);

      try {
        ensureDirSync(absoluteUploadDir);
        cb(null, uploadDir);
      } catch (error) {
        console.error('Directory creation failed:', error);
        cb(new Error('Failed to create upload directory'));
      }
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9-_]/g, '')
        .substring(0, 100);
      
      const uuid = require('uuid').v4().split('-')[0];
      const finalName = `${baseName}-${uuid}${ext}`;
      
      cb(null, finalName);
    },
  });

  const upload = multer({
    storage: aiContextStorage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB per file
      files: 10 // Max 10 files
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = {
        'text/plain': ['.txt'],
        'text/markdown': ['.md'],
        'text/x-tex': ['.tex']
      };

      const ext = path.extname(file.originalname).toLowerCase();
      const mimeType = file.mimetype;

      // Validate extension and MIME type match
      if (!Object.values(allowedTypes).flat().includes(ext) ||
          !allowedTypes[mimeType]?.includes(ext)) {
        return cb(new Error(
          `Invalid file type. Allowed types: ${Object.values(allowedTypes).flat().join(', ')}`
        ));
      }

      cb(null, true);
    }
  });

  return upload.array(fieldName, 10);
}

export { upload, uploadCK, uploadDocument, uploadFiles, uploadAiContext };
