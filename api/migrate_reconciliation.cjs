const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Starting Migration...");

    // 1. Update ball_by_ball
    console.log("Updating ball_by_ball...");
    await pool.query(`
      ALTER TABLE ball_by_ball 
      ADD COLUMN IF NOT EXISTS penalty_runs INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_penalty BOOLEAN DEFAULT FALSE;
    `);

    // 2. Update matches
    console.log("Updating matches...");
    await pool.query(`
      ALTER TABLE matches 
      ADD COLUMN IF NOT EXISTS target_score INTEGER DEFAULT 0;
    `);

    // 3. Update player_match_stats
    console.log("Updating player_match_stats...");
    await pool.query(`
      ALTER TABLE player_match_stats 
      ADD COLUMN IF NOT EXISTS dismissal_type TEXT;
    `);

    console.log("Migration Successful!");
  } catch (err) {
    console.error("Migration Failed:", err);
  } finally {
    await pool.end();
  }
}

run();
