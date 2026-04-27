const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // TATA Production Optimized Settings
  max: 30,                       // Max clients in the pool
  idleTimeoutMillis: 10000,      // Close idle clients after 10 seconds
  connectionTimeoutMillis: 5000, // Wait 5s for a connection before failing
  maxUses: 7500,                 // Close client after 7500 uses to prevent memory leaks
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
