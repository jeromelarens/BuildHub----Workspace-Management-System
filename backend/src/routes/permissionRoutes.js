const express = require('express');
const { getPermissions } = require('../controllers/roleController');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Require authentication to view permissions list
router.use(authenticateToken);

router.get('/', getPermissions);

module.exports = router;
