const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get or derive a 32-byte key from environment secret
 */
const getEncryptionKey = () => {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-fallback-encryption-secret-32b';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Generate a cryptographically secure random hexadecimal token
 * @param {number} bytes - Length of random bytes (default: 32 bytes -> 64 hex chars)
 * @returns {string}
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a token using SHA-256 (single-way hash for tokens stored in DB)
 * @param {string} token
 * @returns {string}
 */
const hashToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} text
 * @returns {string} iv:authTag:encryptedHex
 */
const encryptToken = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt an AES-256-GCM encrypted string
 * @param {string} encryptedString - iv:authTag:encryptedHex
 * @returns {string} plaintext
 */
const decryptToken = (encryptedString) => {
  if (!encryptedString) return null;
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * @param {string|object} payload - string or JSON object
 * @param {string} secret - Webhook secret key
 * @returns {string} sha256=hexSignature
 */
const generateWebhookSignature = (payload, secret) => {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret).update(content).digest('hex');
  return `sha256=${hmac}`;
};

/**
 * Verify HMAC-SHA256 signature with constant-time comparison
 * @param {string|object} payload
 * @param {string} signature - Header signature (e.g., "sha256=...")
 * @param {string} secret
 * @returns {boolean}
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  const expectedSignature = generateWebhookSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
};

module.exports = {
  generateSecureToken,
  hashToken,
  encryptToken,
  decryptToken,
  generateWebhookSignature,
  verifyWebhookSignature,
};
