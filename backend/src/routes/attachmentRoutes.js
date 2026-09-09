const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateAttachmentParams } = require('../validators/attachmentValidator');

// Apply authentication to all attachment routes
router.use(authenticateToken);

// GET /api/attachments/:id/download - Download attachment
router.get('/:id/download', validateAttachmentParams, attachmentController.downloadAttachment);

// DELETE /api/attachments/:id - Delete attachment
router.delete('/:id', validateAttachmentParams, attachmentController.deleteAttachment);

module.exports = router;
