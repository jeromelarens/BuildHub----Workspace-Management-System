const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { resolveSafeFilePath, removePhysicalFile } = require('../services/attachmentService');
const { logAuditEvent } = require('../services/auditService');
const { recordTaskActivity } = require('../services/activityService');

// Helper to check user access to task
const verifyTaskAccess = async (task, userId, userRole) => {
  if (userRole === 'admin') return true;
  if (task.user_id === userId) return true;
  if (task.assigned_to === userId) return true;

  if (task.project_id) {
    if (task.project_created_by === userId) return true;
    const memberRes = await db.query(
      'SELECT id, role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [task.project_id, userId]
    );
    if (memberRes.rows.length > 0) return true;
  }

  return false;
};

// Helper to check project lead status
const isProjectLead = async (projectId, userId) => {
  if (!projectId) return false;
  const res = await db.query(
    'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = $3',
    [projectId, userId, 'lead']
  );
  return res.rows.length > 0;
};

/**
 * Upload an attachment for a task
 * POST /api/tasks/:id/attachments
 */
const uploadTaskAttachment = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file to attach',
      });
    }

    // Check task existence and not deleted
    const taskQuery = `
      SELECT t.id, t.title, t.user_id, t.assigned_to, t.project_id, p.created_by AS project_created_by
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    const taskRes = await db.query(taskQuery, [taskId]);

    if (taskRes.rows.length === 0) {
      removePhysicalFile(req.file.filename);
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = taskRes.rows[0];

    // Authorization check
    const hasAccess = await verifyTaskAccess(task, userId, userRole);
    if (!hasAccess) {
      removePhysicalFile(req.file.filename);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to attach files to this task',
      });
    }

    // Insert metadata into task_attachments
    const insertQuery = `
      INSERT INTO task_attachments (task_id, uploader_id, original_name, storage_name, mime_type, file_size)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, task_id, uploader_id, original_name, mime_type, file_size, created_at
    `;
    const result = await db.query(insertQuery, [
      taskId,
      userId,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size,
    ]);

    const attachment = result.rows[0];

    // Record activity and audit event
    await recordTaskActivity({
      taskId,
      userId,
      action: 'attachment_added',
      newValue: `Attached file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`,
    });

    await logAuditEvent({
      userId,
      action: 'FILE_UPLOADED',
      entityType: 'task_attachment',
      entityId: attachment.id,
      req,
      details: {
        taskId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'File attachment uploaded successfully',
      data: {
        id: attachment.id,
        task_id: attachment.task_id,
        uploader_id: attachment.uploader_id,
        original_name: attachment.original_name,
        mime_type: attachment.mime_type,
        file_size: attachment.file_size,
        download_url: `/api/attachments/${attachment.id}/download`,
        created_at: attachment.created_at,
      },
    });
  } catch (error) {
    if (req.file) {
      removePhysicalFile(req.file.filename);
    }
    console.error('Error in uploadTaskAttachment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all attachments for a task
 * GET /api/tasks/:id/attachments
 */
const getTaskAttachments = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const taskQuery = `
      SELECT t.id, t.user_id, t.assigned_to, t.project_id, p.created_by AS project_created_by
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    const taskRes = await db.query(taskQuery, [taskId]);

    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const task = taskRes.rows[0];
    const hasAccess = await verifyTaskAccess(task, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view attachments for this task',
      });
    }

    const attachQuery = `
      SELECT a.id, a.task_id, a.uploader_id, a.original_name, a.mime_type, a.file_size, a.created_at,
             u.name AS uploader_name, u.email AS uploader_email
      FROM task_attachments a
      LEFT JOIN users u ON a.uploader_id = u.id
      WHERE a.task_id = $1
      ORDER BY a.created_at DESC
    `;
    const result = await db.query(attachQuery, [taskId]);

    return res.status(200).json({
      success: true,
      message: 'Task attachments retrieved successfully',
      data: result.rows.map(att => ({
        id: att.id,
        task_id: att.task_id,
        uploader: att.uploader_id ? {
          id: att.uploader_id,
          name: att.uploader_name,
          email: att.uploader_email,
        } : null,
        original_name: att.original_name,
        mime_type: att.mime_type,
        file_size: att.file_size,
        download_url: `/api/attachments/${att.id}/download`,
        created_at: att.created_at,
      })),
    });
  } catch (error) {
    console.error('Error in getTaskAttachments:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Download an attachment
 * GET /api/attachments/:id/download
 */
const downloadAttachment = async (req, res) => {
  try {
    const attachmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const attachQuery = `
      SELECT a.id, a.task_id, a.uploader_id, a.original_name, a.storage_name, a.mime_type, a.file_size,
             t.user_id AS task_user_id, t.assigned_to AS task_assigned_to, t.project_id, t.deleted_at,
             p.created_by AS project_created_by
      FROM task_attachments a
      JOIN tasks t ON a.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE a.id = $1
    `;
    const attachRes = await db.query(attachQuery, [attachmentId]);

    if (attachRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
    }

    const item = attachRes.rows[0];

    // Check task visibility
    const taskObj = {
      user_id: item.task_user_id,
      assigned_to: item.task_assigned_to,
      project_id: item.project_id,
      project_created_by: item.project_created_by,
    };
    const hasAccess = await verifyTaskAccess(taskObj, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to download this attachment',
      });
    }

    const safePath = resolveSafeFilePath(item.storage_name);
    if (!safePath || !fs.existsSync(safePath)) {
      return res.status(404).json({
        success: false,
        message: 'Attachment file not found on server storage',
      });
    }

    // Set streaming headers
    res.setHeader('Content-Type', item.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.original_name)}"`);
    res.setHeader('Content-Length', item.file_size);

    const stream = fs.createReadStream(safePath);
    stream.on('error', (err) => {
      console.error('File stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error streaming file' });
      }
    });
    return stream.pipe(res);
  } catch (error) {
    console.error('Error in downloadAttachment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete an attachment
 * DELETE /api/attachments/:id
 */
const deleteAttachment = async (req, res) => {
  try {
    const attachmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const attachQuery = `
      SELECT a.id, a.task_id, a.uploader_id, a.original_name, a.storage_name,
             t.user_id AS task_user_id, t.project_id,
             p.created_by AS project_created_by
      FROM task_attachments a
      JOIN tasks t ON a.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE a.id = $1
    `;
    const attachRes = await db.query(attachQuery, [attachmentId]);

    if (attachRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
    }

    const item = attachRes.rows[0];

    // Authorization: Admin, Project Creator/Manager, Project Lead, Task Creator, or Attachment Uploader
    const isAdmin = userRole === 'admin';
    const isUploader = item.uploader_id === userId;
    const isTaskCreator = item.task_user_id === userId;
    const isProjectManager = item.project_id && item.project_created_by === userId;
    const isProjLead = item.project_id && (await isProjectLead(item.project_id, userId));

    if (!isAdmin && !isUploader && !isTaskCreator && !isProjectManager && !isProjLead) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to delete this attachment',
      });
    }

    // Delete database record
    await db.query('DELETE FROM task_attachments WHERE id = $1', [attachmentId]);

    // Delete physical file
    removePhysicalFile(item.storage_name);

    // Record activity and audit
    await recordTaskActivity({
      taskId: item.task_id,
      userId,
      action: 'attachment_deleted',
      newValue: `Removed attachment: ${item.original_name}`,
    });

    await logAuditEvent({
      userId,
      action: 'FILE_DELETED',
      entityType: 'task_attachment',
      entityId: attachmentId,
      req,
      details: {
        taskId: item.task_id,
        fileName: item.original_name,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteAttachment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  uploadTaskAttachment,
  getTaskAttachments,
  downloadAttachment,
  deleteAttachment,
};
