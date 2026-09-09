const bcrypt = require('bcrypt');
const db = require('../config/database');

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Validates admin bootstrap environment configurations
 * @param {string|undefined} email 
 * @param {string|undefined} password 
 */
const validateAdminConfig = (email, password) => {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    throw new Error('Admin bootstrap failed: ADMIN_EMAIL environment variable is required');
  }

  if (!password || typeof password !== 'string' || password.trim() === '') {
    throw new Error('Admin bootstrap failed: ADMIN_PASSWORD environment variable is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error(`Admin bootstrap failed: ADMIN_EMAIL "${email}" is not a valid email address format`);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Admin bootstrap failed: ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  return { normalizedEmail, password };
};

/**
 * Bootstrap default System Admin account in PostgreSQL
 * Idempotent: Only creates the account if it does not already exist.
 * Preserves existing password and records upon subsequent server restarts.
 * 
 * @returns {Promise<{ created: boolean, email: string, verified?: boolean }>}
 */
const bootstrapAdmin = async () => {
  const rawEmail = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;

  const { normalizedEmail, password } = validateAdminConfig(rawEmail, rawPassword);

  // Check if user with ADMIN_EMAIL already exists in PostgreSQL
  const checkQuery = 'SELECT id, name, email, role FROM users WHERE email = $1';
  const checkResult = await db.query(checkQuery, [normalizedEmail]);

  if (checkResult.rows.length === 0) {
    // Admin does not exist: Hash password and create default admin
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const insertQuery = `
      INSERT INTO users (name, email, password, role)
      VALUES ('System Administrator', $1, $2, 'admin')
      RETURNING id, name, email, role, created_at
    `;
    const insertResult = await db.query(insertQuery, [normalizedEmail, hashedPassword]);
    const newAdmin = insertResult.rows[0];

    console.log(`[Bootstrap] Default System Admin account initialized successfully (${newAdmin.email})`);
    return { created: true, email: newAdmin.email };
  }

  const existingUser = checkResult.rows[0];

  // If user exists and is already admin: verify and preserve existing record without modifying password
  if (existingUser.role === 'admin') {
    console.log(`[Bootstrap] Default System Admin account verified (${existingUser.email})`);
    return { created: false, email: existingUser.email, verified: true };
  }

  // If user exists but role is NOT admin: fail safely rather than silently elevating
  throw new Error(
    `Admin bootstrap integrity violation: User with email "${normalizedEmail}" exists with role "${existingUser.role}", not "admin". Manual database resolution required.`
  );
};

module.exports = {
  bootstrapAdmin,
  validateAdminConfig,
};
