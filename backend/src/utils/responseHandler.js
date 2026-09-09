/**
 * Standardized API Response Utilities
 * Provides consistent response formatting for success and error scenarios.
 */

/**
 * Send a standardized success response
 * @param {import('express').Response} res 
 * @param {number} statusCode 
 * @param {string} message 
 * @param {any} data 
 * @param {Record<string, any>} extra 
 */
const sendSuccess = (res, statusCode, message, data = null, extra = {}) => {
  const responsePayload = {
    success: true,
    message,
    data,
    ...extra,
  };
  return res.status(statusCode).json(responsePayload);
};

/**
 * Send a standardized error response
 * @param {import('express').Response} res 
 * @param {number} statusCode 
 * @param {string} message 
 * @param {any} errors 
 */
const sendError = (res, statusCode, message, errors = null) => {
  const responsePayload = {
    success: false,
    message,
  };
  if (errors !== null && errors !== undefined) {
    responsePayload.errors = errors;
  }
  return res.status(statusCode).json(responsePayload);
};

module.exports = {
  sendSuccess,
  sendError,
};
