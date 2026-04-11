const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper for Supabase-like response
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
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
