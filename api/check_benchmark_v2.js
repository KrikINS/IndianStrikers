const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./db.js');

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
    process.exit(0);
  } catch (err) {
    console.error('Error checking benchmark:', err);
    process.exit(1);
  }
}

checkBenchmark();
