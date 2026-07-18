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
