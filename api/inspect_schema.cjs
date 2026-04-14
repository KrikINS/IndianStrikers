const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const tables = ['ball_by_ball', 'matches', 'player_match_stats'];
    for (const table of tables) {
      console.log(`\n--- ${table} columns ---`);
      const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`);
      console.table(res.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
