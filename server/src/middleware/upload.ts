import multer from 'multer';
import { AppError } from './errorHandler';

const ALLOWED_EXTENSIONS = /\.(csv|xlsx|xls)$/i;

export const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
      return cb(new AppError('Only .csv, .xlsx, or .xls files are accepted', 400));
    }
    cb(null, true);
  },
});

const ALLOWED_IMAGE_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMETYPES.has(file.mimetype)) {
      return cb(new AppError('Only JPG, PNG, or WEBP images are accepted', 400));
    }
    cb(null, true);
  },
});
