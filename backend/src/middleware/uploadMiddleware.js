const multer = require('multer');
const { upload, validateAndNormalizeFile, removePhysicalFile } = require('../services/attachmentService');

/**
 * Middleware wrapper for single file upload with standard JSON error handling,
 * deep signature inspection, and canonical MIME type normalization.
 * @param {string} fieldName 
 */
const handleSingleUpload = (fieldName = 'file') => {
  const singleUpload = upload.single(fieldName);

  return (req, res, next) => {
    singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size exceeds maximum allowed limit of 10 MB',
            });
          }
          return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
          });
        }

        if (err.code === 'INVALID_MIME_TYPE' || err.statusCode === 400) {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }

        return res.status(500).json({
          success: false,
          message: 'An unexpected error occurred during file upload',
        });
      }

      // If a file was successfully uploaded to disk, perform deep content & signature inspection
      if (req.file) {
        const validationResult = validateAndNormalizeFile(req.file);
        if (!validationResult.valid) {
          removePhysicalFile(req.file.filename);
          req.file = null;
          return res.status(400).json({
            success: false,
            message: validationResult.message || 'Invalid file type. Supported types: PDF, PNG, JPEG, GIF, WebP, DOC, DOCX, XLS, XLSX, TXT, CSV, ZIP.',
          });
        }

        // Apply canonical normalized MIME type to req.file
        req.file.mimetype = validationResult.canonicalMimeType;
      }

      next();
    });
  };
};

module.exports = {
  handleSingleUpload,
};
