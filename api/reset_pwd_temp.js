const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = "postgresql://postgres:AppTerra#INS@34.93.230.37:5432/postgres";

const pool = new Pool({
  user: 'postgres',
  host: '34.93.230.37',
  database: 'postgres',
  password: 'AppTerra#INS',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkSchema() {
  try {
    console.log('Checking table schema...');
    const schemaRes = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'app_users'
    `);
    console.table(schemaRes.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
