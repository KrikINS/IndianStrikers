const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DB_HOST?.includes('34.93.230.37') || process.env.DATABASE_URL?.includes('sslmode=no-verify')) ? {
    rejectUnauthorized: false
  } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

// Helper for unified response format
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return { data: res.rows, error: null };
  } catch (error) {
    console.error('Database query error', error);
    return { data: null, error };
  }
}

async function getOne(text, params) {
  const result = await query(text, params);
  if (result.error) return result;
  return { data: result.data[0] || null, error: null };
}

module.exports = {
  pool,
  query,
  getOne
};
