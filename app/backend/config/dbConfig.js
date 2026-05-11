const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // TATA Production Optimized Settings
  max: 50,                       // Increased for high-concurrency 
  idleTimeoutMillis: 10000,      // Fast recycling of idle connections
  connectionTimeoutMillis: 5000, // Fail fast if DB is saturated
  maxUses: 7500,                 // Prevent memory leaks
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
