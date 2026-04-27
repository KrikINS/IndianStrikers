const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'api/.env') });

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  password: 'AppTerra#INS',
  port: 5433,
  ssl: false
});

async function checkBenchmark() {
  try {
    const res = await pool.query(`
      SELECT p.name, pls.innings, pls.runs 
      FROM players p 
      JOIN player_legacy_stats pls ON p.id = pls.player_id 
      WHERE p.name ILIKE '%Anees%' OR p.name ILIKE '%Anas%'
    `);
    console.log('Benchmark Check Results:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error checking benchmark:', err);
  } finally {
    await pool.end();
  }
}

checkBenchmark();
