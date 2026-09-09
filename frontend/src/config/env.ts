/**
 * Application environment configuration
 */
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'BUILDHUB',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};
