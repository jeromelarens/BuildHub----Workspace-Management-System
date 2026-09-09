const express = require('express');
const {
  updateComment,
  deleteComment,
} = require('../controllers/commentController');
const authenticateToken = require('../middleware/authMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');
const {
  validateCommentId,
  validateCommentBody,
} = require('../validators/commentValidator');

const router = express.Router();

const validateCommentIdParam = (req, res, next) => {
  const validation = validateCommentId(req.params.id);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error || 'Invalid comment ID. ID must be a positive integer',
      errors: { id: validation.error || 'Invalid comment ID' },
    });
  }
  req.params.id = validation.parsedId;
  next();
};

const validateComment = (req, res, next) => {
  const validation = validateCommentBody(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }
  req.body = validation.normalizedData;
  next();
};

router.use(authenticateToken);

router.put('/:id', requireJsonContentType, validateCommentIdParam, validateComment, updateComment);
router.delete('/:id', validateCommentIdParam, deleteComment);

module.exports = router;
