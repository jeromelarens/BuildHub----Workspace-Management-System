const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const customFieldRoutes = require('./routes/customFieldRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');

const { authLimiter, apiLimiter } = require('./middleware/rateLimitMiddleware');

const app = express();

// Trust reverse proxy in production or when configured (ensures correct client IP for rate limiting and audit logs)
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security Middleware: Helmet Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Workspace-Id', 'Workspace-Id'],
};
app.use(cors(corsOptions));

// General API Rate Limiting
app.use(apiLimiter);

// Middleware: Parse JSON request bodies (limit 5MB)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Helper to mount routes for backward compatibility (/api) and versioning (/api/v1)
const mountAppRoutes = (prefix) => {
  // Health check
  app.get(`${prefix}/health`, (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Task Management API is running',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Auth endpoints (with rate limiting)
  app.use(`${prefix}/auth`, authLimiter, authRoutes);

  // Core API Modules
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/roles`, roleRoutes);
  app.use(`${prefix}/permissions`, permissionRoutes);
  app.use(`${prefix}/projects`, projectRoutes);
  app.use(`${prefix}/tasks`, taskRoutes);
  app.use(`${prefix}/comments`, commentRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/attachments`, attachmentRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/audit-logs`, auditLogRoutes);
  app.use(`${prefix}/dashboard`, dashboardRoutes);

  // Enterprise API Modules
  app.use(`${prefix}/workspaces`, workspaceRoutes);
  app.use(`${prefix}/webhooks`, webhookRoutes);
  app.use(`${prefix}/custom-fields`, customFieldRoutes);
  app.use(`${prefix}/approvals`, approvalRoutes);
  app.use(`${prefix}/time-entries`, timeTrackingRoutes);
};

// Mount versioned (/api/v1) and unversioned (/api) endpoints
mountAppRoutes('/api/v1');
mountAppRoutes('/api');

// Central 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
  });
});

// Central Error Handling Middleware
app.use((err, req, res, next) => {
  // Handle JSON parse errors from invalid body format
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload received',
    });
  }

  console.error('Unhandled server error:', err.message);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

module.exports = app;
