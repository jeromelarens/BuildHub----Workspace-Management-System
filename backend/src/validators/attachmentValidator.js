const validateAttachmentParams = (req, res, next) => {
  const attachmentId = req.params.id || req.params.attachmentId;
  const taskId = req.params.taskId || (req.params.id && req.baseUrl.includes('/tasks') ? req.params.id : null);

  if (attachmentId !== undefined && attachmentId !== null) {
    const id = parseInt(attachmentId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Attachment ID must be a positive integer',
      });
    }
  }

  if (taskId !== undefined && taskId !== null) {
    const id = parseInt(taskId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Task ID must be a positive integer',
      });
    }
  }

  next();
};

module.exports = {
  validateAttachmentParams,
};
