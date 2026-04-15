const path = require('path');
// CRITICAL: Load env vars BEFORE requiring db.js
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { pool } = require('./db.js');

async function testConnection() {
  console.log("Testing connection to database via proxy...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("DB_HOST:", process.env.DB_HOST);
  
  try {
    const client = await pool.connect();
    console.log("Successfully connected to the database!");
    const res = await client.query('SELECT NOW() as current_time');
    console.log("Database time:", res.rows[0].current_time);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error("Failed to connect to the database:", err.message);
    process.exit(1);
  }
}

testConnection();
