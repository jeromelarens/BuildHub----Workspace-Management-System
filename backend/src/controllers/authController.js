const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { logAuditEvent } = require('../services/auditService');
const { generateSecureToken, hashToken } = require('../utils/cryptoUtils');
const { sendPasswordResetEmail, sendEmailVerificationEmail } = require('../services/emailService');

/**
 * Register a new user
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const userRole = role || 'employee';

    // Check if user with given normalized email already exists
    const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
    const existingUserResult = await db.query(existingUserQuery, [email]);

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    // Hash password with bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user record with role
    const insertUserQuery = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at
    `;
    const insertResult = await db.query(insertUserQuery, [name, email, hashedPassword, userRole]);
    const newUser = insertResult.rows[0];

    // Generate initial email verification token
    const verifyToken = generateSecureToken(32);
    const tokenHash = hashToken(verifyToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.query(`
      INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3);
    `, [newUser.id, tokenHash, expiresAt]);

    // Send verification email in background
    sendEmailVerificationEmail(newUser.email, verifyToken, newUser.name).catch((err) => {
      console.error('[Auth] Failed to send verification email:', err.message);
    });

    // Log audit event
    await logAuditEvent({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: newUser.id,
      req,
      details: { email: newUser.email, role: newUser.role },
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email address.',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || userRole,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    console.error('Error in registerUser:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Login an existing user and return JWT
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Query user by normalized email
    const userQuery = 'SELECT id, name, email, password, role, email_verified_at FROM users WHERE email = $1';
    const userResult = await db.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = userResult.rows[0];
    const userRole = user.role || 'employee';

    // Verify password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token containing user ID, email, and role
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: userRole,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      }
    );

    // Log audit event
    await logAuditEvent({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      req,
      details: { email: user.email, role: userRole },
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: userRole,
          is_email_verified: !!user.email_verified_at,
        },
      },
    });
  } catch (error) {
    console.error('Error in loginUser:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Request Password Reset
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const userRes = await db.query('SELECT id, name, email FROM users WHERE email = $1;', [email]);

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];

      // Invalidate existing active reset tokens
      await db.query(`
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND used_at IS NULL;
      `, [user.id]);

      // Generate cryptographically secure token & store its SHA-256 hash
      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.query(`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3);
      `, [user.id, tokenHash, expiresAt]);

      // Dispatch reset email
      sendPasswordResetEmail(user.email, rawToken, user.name).catch((err) => {
        console.error('[Auth] Failed to dispatch password reset email:', err.message);
      });

      // Audit log event
      await logAuditEvent({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'user',
        entityId: user.id,
        req,
        details: { email: user.email },
      });
    }

    // Always return generic response to prevent account enumeration
    return res.status(200).json({
      success: true,
      message: 'If that email address is registered in our system, we have sent a password reset link.',
    });
  } catch (error) {
    console.error('Error in forgotPassword:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Reset Password with valid token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { token, newPassword } = req.body;
    const tokenHash = hashToken(token);

    await client.query('BEGIN');

    // Find valid, unused, unexpired token
    const tokenRes = await client.query(`
      SELECT prt.*, u.email, u.name
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > CURRENT_TIMESTAMP
      FOR UPDATE;
    `, [tokenHash]);

    if (tokenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid, expired, or already used password reset token',
      });
    }

    const resetRecord = tokenRes.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await client.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [
      hashedPassword,
      resetRecord.user_id,
    ]);

    // Mark current token as used
    await client.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1;', [
      resetRecord.id,
    ]);

    // Invalidate all other reset tokens for this user
    await client.query(`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND used_at IS NULL;
    `, [resetRecord.user_id]);

    await client.query('COMMIT');

    // Log audit event
    await logAuditEvent({
      userId: resetRecord.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'user',
      entityId: resetRecord.user_id,
      req,
      details: { email: resetRecord.email },
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in resetPassword:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  } finally {
    client.release();
  }
};

/**
 * Verify Email with Token
 * POST /api/auth/verify-email
 */
const verifyEmail = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { token } = req.body;
    const tokenHash = hashToken(token);

    await client.query('BEGIN');

    const tokenRes = await client.query(`
      SELECT evt.*, u.email, u.email_verified_at
      FROM email_verification_tokens evt
      JOIN users u ON evt.user_id = u.id
      WHERE evt.token_hash = $1 AND evt.used_at IS NULL AND evt.expires_at > CURRENT_TIMESTAMP
      FOR UPDATE;
    `, [tokenHash]);

    if (tokenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid, expired, or already used email verification token',
      });
    }

    const tokenRecord = tokenRes.rows[0];

    // Update user verified timestamp
    await client.query('UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1;', [
      tokenRecord.user_id,
    ]);

    // Mark token as used
    await client.query('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1;', [
      tokenRecord.id,
    ]);

    await client.query('COMMIT');

    // Audit log
    await logAuditEvent({
      userId: tokenRecord.user_id,
      action: 'EMAIL_VERIFIED',
      entityType: 'user',
      entityId: tokenRecord.user_id,
      req,
      details: { email: tokenRecord.email },
    });

    return res.status(200).json({
      success: true,
      message: 'Email address verified successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in verifyEmail:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  } finally {
    client.release();
  }
};

/**
 * Resend Email Verification Token
 * POST /api/auth/resend-verification
 */
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const userRes = await db.query('SELECT id, name, email, email_verified_at FROM users WHERE email = $1;', [email]);

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];

      if (!user.email_verified_at) {
        // Invalidate previous tokens
        await db.query(`
          UPDATE email_verification_tokens
          SET used_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND used_at IS NULL;
        `, [user.id]);

        // Create new token
        const rawToken = generateSecureToken(32);
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.query(`
          INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
          VALUES ($1, $2, $3);
        `, [user.id, tokenHash, expiresAt]);

        sendEmailVerificationEmail(user.email, rawToken, user.name).catch((err) => {
          console.error('[Auth] Failed to resend verification email:', err.message);
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'If the account exists and is unverified, a new verification link has been sent.',
    });
  } catch (error) {
    console.error('Error in resendVerification:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get Email Verification Status
 * GET /api/auth/verification-status
 */
const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRes = await db.query('SELECT id, email, email_verified_at FROM users WHERE id = $1;', [userId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRes.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        is_verified: !!user.email_verified_at,
        email_verified_at: user.email_verified_at,
      },
    });
  } catch (error) {
    console.error('Error in getVerificationStatus:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getVerificationStatus,
};

