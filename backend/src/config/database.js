const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('sslmode=verify-full') || process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'task_management_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20, // maximum number of clients in the pool
      idleTimeoutMillis: 30000, // close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // return an error after 5 seconds if connection could not be established
    };

const pool = new Pool(poolConfig);

// Listener for unexpected errors on idle clients
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
