const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // TATA Production Optimized Settings
  max: 50,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500,
  // SSL Configuration for Production Clouds
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const DbService = {
  query: async (text, params) => {
    return await pool.query(text, params);
  },

  getClient: async () => {
    return await pool.connect();
  },

  /**
   * Gracefully close all pool connections
   */
  shutdown: async () => {
    await pool.end();
  }
};

module.exports = DbService;
