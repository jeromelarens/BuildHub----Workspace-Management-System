const dotenv = require('dotenv');

// Load environment variables before any other imports
dotenv.config();

const app = require('./app');
const { pool } = require('./config/database');
const { runAllMigrations } = require('./services/dbMigrationService');
const { bootstrapAdmin } = require('./services/adminBootstrapService');

const PORT = process.env.PORT || 5000;

// Verify essential environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
  process.exit(1);
}

// Startup Sequence: Connect DB -> Run Migrations -> Bootstrap Admin -> Start Server
const startServer = async () => {
  try {
    // 1. Connect to PostgreSQL database
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database');
    client.release();

    // 2. Non-destructive schema migrations
    await runAllMigrations();

    // 3. Bootstrap default System Admin account
    await bootstrapAdmin();

    // 3. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('Shutting down server gracefully...');
      server.close(() => {
        pool.end(() => {
          console.log('Database pool closed. Exiting process.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Global process resilience handlers for production
    process.on('unhandledRejection', (reason, promise) => {
      console.error('CRITICAL: Unhandled Promise Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('FATAL: Uncaught Exception thrown:', error.message, error.stack);
      shutdown();
    });
  } catch (error) {
    console.error('FATAL STARTUP ERROR:', error.message);
    process.exit(1);
  }
};

startServer();
