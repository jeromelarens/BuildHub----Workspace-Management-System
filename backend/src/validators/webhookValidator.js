/**
 * Webhook Input Validators
 */

const validateCreateWebhookBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, errors: { body: 'Request body must be an object' } };
  }
  const errors = {};
  const { url, description, events } = body;

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    errors.url = 'Webhook URL is required';
  } else {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        errors.url = 'URL must use http or https protocol';
      }
    } catch {
      errors.url = 'Invalid destination URL format';
    }
  }

  if (events !== undefined && events !== null) {
    if (!Array.isArray(events)) {
      errors.events = 'Events must be an array of event type strings';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      url: url.trim(),
      description: description ? description.trim() : null,
      events: Array.isArray(events) ? events : ['*'],
    },
  };
};

module.exports = {
  validateCreateWebhookBody,
};
