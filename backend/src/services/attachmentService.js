const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Base directory for task attachments
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/task-attachments');

// Ensure directory exists safely
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 10 MB maximum file size limit
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Whitelist of allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
]);

// Map extension (normalized lowercase with dot) to canonical MIME type
const EXTENSION_TO_MIME_MAP = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
};

// Map canonical MIME type to safe default extension
const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

// Configure Multer Disk Storage with safe generated filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = EXTENSION_TO_MIME_MAP[ext]
      ? ext
      : MIME_EXTENSION_MAP[file.mimetype] || '.bin';
    const storageName = `att_${Date.now()}_${randomHex}${safeExt}`;
    cb(null, storageName);
  },
});

/**
 * File filter for Multer
 * Accepts supported explicit MIME types OR application/octet-stream if the extension is in the supported whitelist.
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isSupportedExt = Boolean(EXTENSION_TO_MIME_MAP[ext]);

  // If MIME is octet-stream, only accept if extension maps to a supported type
  if (file.mimetype === 'application/octet-stream') {
    if (isSupportedExt) {
      return cb(null, true);
    }
    const error = new Error('Invalid file type: application/octet-stream. Allowed types include PDF, images (PNG, JPEG, GIF, WebP), documents (DOC, DOCX, XLS, XLSX, TXT, CSV), and ZIP files.');
    error.statusCode = 400;
    error.code = 'INVALID_MIME_TYPE';
    return cb(error, false);
  }

  // If MIME is explicitly declared, verify it is in allowed list and has a compatible supported extension
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !isSupportedExt) {
    const error = new Error(`Invalid file type: ${file.mimetype}. Allowed types include PDF, images (PNG, JPEG, GIF, WebP), documents (DOC, DOCX, XLS, XLSX, TXT, CSV), and ZIP files.`);
    error.statusCode = 400;
    error.code = 'INVALID_MIME_TYPE';
    return cb(error, false);
  }

  cb(null, true);
};

// Multer upload middleware instance
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

/**
 * Validate and safely resolve absolute physical path within UPLOADS_DIR
 * @param {string} storageName 
 * @returns {string|null}
 */
const resolveSafeFilePath = (storageName) => {
  if (!storageName || typeof storageName !== 'string') return null;

  // Prevent path traversal
  const cleanName = path.basename(storageName);
  const resolvedPath = path.resolve(UPLOADS_DIR, cleanName);

  if (!resolvedPath.startsWith(UPLOADS_DIR)) {
    return null;
  }

  return resolvedPath;
};

/**
 * Remove physical file safely from disk
 * @param {string} storageName 
 */
const removePhysicalFile = (storageName) => {
  try {
    const filePath = resolveSafeFilePath(storageName);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error removing physical file:', err.message);
  }
};

/**
 * Deep inspection of file content to verify magic bytes and binary signatures.
 * Normalizes application/octet-stream to the canonical MIME type.
 *
 * @param {object} file - Multer file object with { path, filename, originalname, mimetype, size }
 * @returns {{ valid: boolean, canonicalMimeType?: string, message?: string }}
 */
const validateAndNormalizeFile = (file) => {
  if (!file || !file.path) {
    return { valid: false, message: 'No file provided for inspection' };
  }

  const filePath = file.path;
  if (!fs.existsSync(filePath)) {
    return { valid: false, message: 'Uploaded file not found on disk' };
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  const canonicalMime = EXTENSION_TO_MIME_MAP[ext];

  if (!canonicalMime) {
    return {
      valid: false,
      message: 'Invalid file type. Supported types: PDF, PNG, JPEG, GIF, WebP, DOC, DOCX, XLS, XLSX, TXT, CSV, ZIP.',
    };
  }

  // Read header bytes (first 4096 bytes) for signature validation
  const bufferSize = Math.min(Math.max(file.size, 1), 4096);
  const buffer = Buffer.alloc(bufferSize);
  let bytesRead = 0;
  let fd;

  try {
    fd = fs.openSync(filePath, 'r');
    bytesRead = fs.readSync(fd, buffer, 0, bufferSize, 0);
  } catch (err) {
    return { valid: false, message: 'Failed to inspect file contents' };
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (e) {}
    }
  }

  const header = buffer.subarray(0, bytesRead);

  // 1. Global Executable / Dangerous Binary Blacklist
  // Check for Windows PE/DOS header ('MZ' = 0x4D, 0x5A)
  if (bytesRead >= 2 && header[0] === 0x4D && header[1] === 0x5A) {
    return {
      valid: false,
      message: 'Executable files (.exe, DOS/PE binaries) are strictly prohibited.',
    };
  }
  // Check for Linux ELF header ('\x7FELF' = 0x7F, 0x45, 0x4C, 0x46)
  if (bytesRead >= 4 && header[0] === 0x7F && header[1] === 0x45 && header[2] === 0x4C && header[3] === 0x46) {
    return {
      valid: false,
      message: 'Executable binaries (ELF) are strictly prohibited.',
    };
  }
  // Check for Mach-O / Java Class Bytecode ('\xCA\xFE\xBA\xBE' or '\xFE\xED\xFA\xCE')
  if (bytesRead >= 4 && header[0] === 0xCA && header[1] === 0xFE && header[2] === 0xBA && header[3] === 0xBE) {
    return {
      valid: false,
      message: 'Compiled bytecode or binary executables are strictly prohibited.',
    };
  }

  // 2. Type-Specific Signature & Content Verification
  switch (canonicalMime) {
    case 'application/pdf': {
      // PDF must begin with '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D)
      if (bytesRead < 5 || header.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return {
          valid: false,
          message: 'Invalid PDF file: File signature mismatch. The file content does not match a valid PDF document.',
        };
      }
      break;
    }

    case 'image/png': {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      if (bytesRead < 8 || !pngSig.every((b, i) => header[i] === b)) {
        return {
          valid: false,
          message: 'Invalid PNG image: File signature mismatch.',
        };
      }
      break;
    }

    case 'image/jpeg': {
      // JPEG magic bytes: FF D8 FF
      if (bytesRead < 3 || header[0] !== 0xFF || header[1] !== 0xD8 || header[2] !== 0xFF) {
        return {
          valid: false,
          message: 'Invalid JPEG image: File signature mismatch.',
        };
      }
      break;
    }

    case 'image/gif': {
      // GIF magic bytes: 'GIF87a' or 'GIF89a'
      const sig = header.subarray(0, 6).toString('ascii');
      if (bytesRead < 6 || (sig !== 'GIF87a' && sig !== 'GIF89a')) {
        return {
          valid: false,
          message: 'Invalid GIF image: File signature mismatch.',
        };
      }
      break;
    }

    case 'image/webp': {
      // WebP magic bytes: RIFF at 0..3 and WEBP at 8..11
      if (
        bytesRead < 12 ||
        header.subarray(0, 4).toString('ascii') !== 'RIFF' ||
        header.subarray(8, 12).toString('ascii') !== 'WEBP'
      ) {
        return {
          valid: false,
          message: 'Invalid WebP image: File signature mismatch.',
        };
      }
      break;
    }

    case 'application/zip': {
      // ZIP magic bytes: 'PK\x03\x04' or 'PK\x05\x06' (empty zip) or 'PK\x07\x08'
      const isZip =
        bytesRead >= 4 &&
        header[0] === 0x50 &&
        header[1] === 0x4B &&
        (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07);
      if (!isZip) {
        return {
          valid: false,
          message: 'Invalid ZIP archive: File signature mismatch.',
        };
      }
      break;
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { // .xlsx
      // Office OpenXML formats are ZIP archives
      const isZip =
        bytesRead >= 4 &&
        header[0] === 0x50 &&
        header[1] === 0x4B &&
        (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07);
      if (!isZip) {
        return {
          valid: false,
          message: `Invalid ${ext.toUpperCase().slice(1)} document: Not a valid Office OpenXML package.`,
        };
      }
      break;
    }

    case 'application/msword': // .doc
    case 'application/vnd.ms-excel': { // .xls
      // Legacy Microsoft binary documents use OLE CFB format: D0 CF 11 E0 A1 B1 1A E1
      const oleSig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
      const isOle = bytesRead >= 8 && oleSig.every((b, i) => header[i] === b);
      if (!isOle) {
        return {
          valid: false,
          message: `Invalid ${ext.toUpperCase().slice(1)} document: Not a valid Microsoft Office binary format.`,
        };
      }
      break;
    }

    case 'text/plain':
    case 'text/csv': {
      // For TXT and CSV, verify the content does not contain binary null bytes (0x00) or high control chars
      let nullCount = 0;
      for (let i = 0; i < bytesRead; i++) {
        const byte = header[i];
        if (byte === 0x00) {
          nullCount++;
        }
      }
      if (nullCount > 0) {
        return {
          valid: false,
          message: `Invalid ${ext.slice(1).toUpperCase()} file: Binary data detected in text file.`,
        };
      }
      break;
    }

    default:
      return {
        valid: false,
        message: 'Unsupported file format.',
      };
  }

  return {
    valid: true,
    canonicalMimeType: canonicalMime,
  };
};

module.exports = {
  upload,
  UPLOADS_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  EXTENSION_TO_MIME_MAP,
  MIME_EXTENSION_MAP,
  resolveSafeFilePath,
  removePhysicalFile,
  validateAndNormalizeFile,
};
