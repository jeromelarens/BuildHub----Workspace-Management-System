const db = require('../config/database');
const { generateSecureToken, generateWebhookSignature } = require('../utils/cryptoUtils');

const MAX_DELIVERY_ATTEMPTS = 5;
const BACKOFF_SCHEDULE_SECONDS = [60, 300, 900, 3600, 14400]; // 1m, 5m, 15m, 1h, 4h

/**
 * Validate URL for security
 */
const isValidWebhookUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Create a new Webhook Endpoint in a workspace
 */
const createWebhookEndpoint = async ({ workspaceId, url, description, events, userId }) => {
  if (!isValidWebhookUrl(url)) {
    throw new Error('Invalid webhook destination URL. Must be a valid HTTP or HTTPS address.');
  }

  const secret = `whsec_${generateSecureToken(24)}`;
  const normalizedEvents = Array.isArray(events) ? events : ['*'];

  const result = await db.query(`
    INSERT INTO webhook_endpoints (workspace_id, url, secret, description, events, is_active, created_by)
    VALUES ($1, $2, $3, $4, $5, TRUE, $6)
    RETURNING id, workspace_id, url, secret, description, events, is_active, created_at, updated_at;
  `, [workspaceId, url, secret, description || null, JSON.stringify(normalizedEvents), userId]);

  return result.rows[0];
};

/**
 * Get all webhook endpoints for a workspace (masks secret)
 */
const getWorkspaceWebhookEndpoints = async (workspaceId) => {
  const result = await db.query(`
    SELECT id, workspace_id, url, description, events, is_active, created_at, updated_at
    FROM webhook_endpoints
    WHERE workspace_id = $1
    ORDER BY created_at DESC;
  `, [workspaceId]);

  return result.rows;
};

/**
 * Get single webhook endpoint by ID with tenant verification
 */
const getWebhookEndpointById = async (endpointId, workspaceId) => {
  const result = await db.query(`
    SELECT id, workspace_id, url, description, events, is_active, created_at, updated_at
    FROM webhook_endpoints
    WHERE id = $1 AND workspace_id = $2;
  `, [endpointId, workspaceId]);

  return result.rows[0] || null;
};

/**
 * Update a webhook endpoint
 */
const updateWebhookEndpoint = async (endpointId, workspaceId, updates) => {
  const endpoint = await getWebhookEndpointById(endpointId, workspaceId);
  if (!endpoint) {
    throw new Error('Webhook endpoint not found or access denied in this workspace');
  }

  if (updates.url && !isValidWebhookUrl(updates.url)) {
    throw new Error('Invalid webhook destination URL');
  }

  const newUrl = updates.url !== undefined ? updates.url : endpoint.url;
  const newDesc = updates.description !== undefined ? updates.description : endpoint.description;
  const newEvents = updates.events !== undefined ? JSON.stringify(updates.events) : JSON.stringify(endpoint.events);
  const newActive = updates.is_active !== undefined ? updates.is_active : endpoint.is_active;

  const result = await db.query(`
    UPDATE webhook_endpoints
    SET url = $1, description = $2, events = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5 AND workspace_id = $6
    RETURNING id, workspace_id, url, description, events, is_active, created_at, updated_at;
  `, [newUrl, newDesc, newEvents, newActive, endpointId, workspaceId]);

  return result.rows[0];
};

/**
 * Delete a webhook endpoint
 */
const deleteWebhookEndpoint = async (endpointId, workspaceId) => {
  const result = await db.query(`
    DELETE FROM webhook_endpoints
    WHERE id = $1 AND workspace_id = $2
    RETURNING id;
  `, [endpointId, workspaceId]);

  if (result.rows.length === 0) {
    throw new Error('Webhook endpoint not found or access denied');
  }
  return { success: true, deletedId: endpointId };
};

/**
 * Publish a webhook event into the workspace queue and trigger deliveries
 */
const publishWebhookEvent = async (workspaceId, eventType, data, idempotencyKey = null) => {
  const fullPayload = {
    event_id: `evt_${generateSecureToken(16)}`,
    event_type: eventType,
    workspace_id: workspaceId,
    timestamp: new Date().toISOString(),
    data,
  };

  // Check idempotency if key provided
  if (idempotencyKey) {
    const existing = await db.query('SELECT * FROM webhook_events WHERE idempotency_key = $1;', [idempotencyKey]);
    if (existing.rows.length > 0) {
      return { event: existing.rows[0], duplicate: true };
    }
  }

  // Insert event
  const eventRes = await db.query(`
    INSERT INTO webhook_events (workspace_id, event_type, payload, idempotency_key)
    VALUES ($1, $2, $3, $4)
    RETURNING id, workspace_id, event_type, payload, idempotency_key, created_at;
  `, [workspaceId, eventType, JSON.stringify(fullPayload), idempotencyKey]);

  const eventRecord = eventRes.rows[0];

  // Find all active endpoints subscribed to this event in this workspace
  const endpointsRes = await db.query(`
    SELECT id, url, secret, events
    FROM webhook_endpoints
    WHERE workspace_id = $1 AND is_active = TRUE;
  `, [workspaceId]);

  const matchingEndpoints = endpointsRes.rows.filter((ep) => {
    const subscribed = typeof ep.events === 'string' ? JSON.parse(ep.events) : ep.events;
    return subscribed.includes('*') || subscribed.includes(eventType);
  });

  // Create pending delivery records for each matching endpoint
  const deliveries = [];
  for (const endpoint of matchingEndpoints) {
    const deliveryRes = await db.query(`
      INSERT INTO webhook_deliveries (
        webhook_endpoint_id, webhook_event_id, status, attempt_count
      )
      VALUES ($1, $2, 'pending', 0)
      RETURNING id, webhook_endpoint_id, webhook_event_id, status, attempt_count, created_at;
    `, [endpoint.id, eventRecord.id]);

    const deliveryRecord = deliveryRes.rows[0];

    // Asynchronously dispatch delivery attempt without blocking request loop
    deliverWebhookPayload(endpoint, eventRecord, deliveryRecord, fullPayload).catch((err) => {
      console.error(`[Webhook Dispatch Error] Delivery ${deliveryRecord.id}:`, err.message);
    });

    deliveries.push(deliveryRecord);
  }

  return {
    event: eventRecord,
    deliveriesDispatched: deliveries.length,
  };
};

/**
 * Perform actual HTTP delivery with HMAC-SHA256 signature
 */
const deliverWebhookPayload = async (endpoint, eventRecord, deliveryRecord, payload) => {
  const startTime = Date.now();
  const timestamp = Math.floor(startTime / 1000).toString();
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = generateWebhookSignature(`${timestamp}.${payloadString}`, endpoint.secret);

  const attempt = (deliveryRecord.attempt_count || 0) + 1;

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TaskFlow-Event': eventRecord.event_type,
        'X-TaskFlow-Event-Id': payload.event_id || `evt_${eventRecord.id}`,
        'X-TaskFlow-Timestamp': timestamp,
        'X-TaskFlow-Signature': signature,
        'X-TaskFlow-Delivery': String(deliveryRecord.id),
        'User-Agent': 'TaskFlow-Webhook-Dispatcher/3.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const responseTimeMs = Date.now() - startTime;
    const responseBody = await response.text();

    if (response.ok) {
      await db.query(`
        UPDATE webhook_deliveries
        SET http_status = $1, response_body = $2, response_time_ms = $3,
            attempt_count = $4, status = 'delivered', delivered_at = CURRENT_TIMESTAMP,
            error_message = NULL, next_retry_at = NULL
        WHERE id = $5;
      `, [response.status, responseBody.substring(0, 1000), responseTimeMs, attempt, deliveryRecord.id]);
    } else {
      await handleDeliveryFailure(deliveryRecord.id, attempt, response.status, responseBody.substring(0, 500), responseTimeMs);
    }
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    await handleDeliveryFailure(deliveryRecord.id, attempt, 0, null, responseTimeMs, err.message);
  }
};

/**
 * Handle delivery failure & schedule exponential backoff retry
 */
const handleDeliveryFailure = async (deliveryId, attemptCount, httpStatus, responseBody, responseTimeMs, errorMessage = null) => {
  if (attemptCount < MAX_DELIVERY_ATTEMPTS) {
    const backoffSeconds = BACKOFF_SCHEDULE_SECONDS[attemptCount - 1] || 3600;
    const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);

    await db.query(`
      UPDATE webhook_deliveries
      SET http_status = $1, response_body = $2, response_time_ms = $3,
          attempt_count = $4, status = 'retrying', next_retry_at = $5,
          error_message = $6
      WHERE id = $7;
    `, [httpStatus, responseBody, responseTimeMs, attemptCount, nextRetryAt, errorMessage || `HTTP status ${httpStatus}`, deliveryId]);
  } else {
    // Exceeded max retry limit -> mark failed
    await db.query(`
      UPDATE webhook_deliveries
      SET http_status = $1, response_body = $2, response_time_ms = $3,
          attempt_count = $4, status = 'failed', next_retry_at = NULL,
          error_message = $5
      WHERE id = $6;
    `, [httpStatus, responseBody, responseTimeMs, attemptCount, errorMessage || `Delivery failed after ${attemptCount} attempts`, deliveryId]);
  }
};

/**
 * Get delivery logs for a webhook endpoint
 */
const getEndpointDeliveries = async (endpointId, workspaceId, limit = 50) => {
  const result = await db.query(`
    SELECT wd.id, wd.webhook_endpoint_id, wd.webhook_event_id, wd.http_status,
           wd.response_time_ms, wd.attempt_count, wd.status, wd.error_message,
           wd.next_retry_at, wd.delivered_at, wd.created_at,
           we.event_type, we.payload
    FROM webhook_deliveries wd
    JOIN webhook_endpoints wep ON wd.webhook_endpoint_id = wep.id
    JOIN webhook_events we ON wd.webhook_event_id = we.id
    WHERE wep.id = $1 AND wep.workspace_id = $2
    ORDER BY wd.created_at DESC
    LIMIT $3;
  `, [endpointId, workspaceId, limit]);

  return result.rows;
};

module.exports = {
  isValidWebhookUrl,
  createWebhookEndpoint,
  getWorkspaceWebhookEndpoints,
  getWebhookEndpointById,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  publishWebhookEvent,
  deliverWebhookPayload,
  getEndpointDeliveries,
};
