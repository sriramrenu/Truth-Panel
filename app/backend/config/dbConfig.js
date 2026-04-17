const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const DbService = {
  /**
   * Execute a Database Query
   * @param {string} text - The raw SQL query (e.g. 'SELECT * FROM users WHERE id = $1')
   * @param {Array} params - Array of parameters mapped to $1, $2 etc.
   * @returns {Object} Result of query ({ rows, rowCount, ... })
   */
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Expose a generic interface to get a single client for transactions.
   */
  getClient: async () => {
    return await pool.connect();
  }
};

module.exports = DbService;
