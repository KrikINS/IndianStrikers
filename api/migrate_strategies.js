require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  try {
    console.log('Ensuring strategies table exists...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS strategies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        batter_hand VARCHAR(50),
        match_phase VARCHAR(50),
        bowler_id BIGINT,
        batter_id BIGINT,
        positions JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create an index on bowler_id for faster lookups
    await db.query('CREATE INDEX IF NOT EXISTS idx_strategies_bowler ON strategies(bowler_id)');
    
    console.log('Strategies table migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
