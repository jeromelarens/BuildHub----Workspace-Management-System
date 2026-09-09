const express = require('express');
const {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} = require('../controllers/workspaceController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { requireJsonContentType } = require('../middleware/validationMiddleware');

const router = express.Router();

// All workspace routes require authentication
router.use(authenticateToken);

router.post('/', requireJsonContentType, requirePermission('workspace:create'), createWorkspace);
router.get('/', getUserWorkspaces);
router.get('/:id', getWorkspaceById);
router.put('/:id', requireJsonContentType, updateWorkspace);
router.delete('/:id', deleteWorkspace);

// Members sub-resource
router.get('/:id/members', getWorkspaceMembers);
router.post('/:id/members', requireJsonContentType, addWorkspaceMember);
router.put('/:id/members/:userId', requireJsonContentType, updateWorkspaceMemberRole);
router.delete('/:id/members/:userId', removeWorkspaceMember);

module.exports = router;
