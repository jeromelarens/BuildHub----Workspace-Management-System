const express = require('express');
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getVerificationStatus,
} = require('../controllers/authController');
const {
  requireJsonContentType,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateResendVerification,
} = require('../middleware/validationMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply Content-Type validator to auth routes with payloads
router.use(requireJsonContentType);

// Public Authentication Endpoints
router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);

// Password Reset Flow
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

// Email Verification Flow
router.post('/verify-email', validateVerifyEmail, verifyEmail);
router.post('/resend-verification', validateResendVerification, resendVerification);
router.get('/verification-status', authenticateToken, getVerificationStatus);

module.exports = router;

