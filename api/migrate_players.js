require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  try {
    console.log('Ensuring all columns exist in players table...');
    
    const columns = [
      ['name', 'VARCHAR(255) NOT NULL'],
      ['role', 'VARCHAR(50)'],
      ['batting_style', 'VARCHAR(50)'],
      ['bowling_style', 'VARCHAR(50)'],
      ['avatar_url', 'TEXT'],
      ['matches_played', 'INTEGER DEFAULT 0'],
      ['runs_scored', 'INTEGER DEFAULT 0'],
      ['wickets_taken', 'INTEGER DEFAULT 0'],
      ['average', 'DECIMAL(5,2) DEFAULT 0'],
      ['is_captain', 'BOOLEAN DEFAULT FALSE'],
      ['is_vice_captain', 'BOOLEAN DEFAULT FALSE'],
      ['is_available', 'BOOLEAN DEFAULT TRUE'],
      ['batting_stats', 'JSONB DEFAULT \'{}\'::jsonb'],
      ['bowling_stats', 'JSONB DEFAULT \'{}\'::jsonb'],
      ['linked_user_id', 'BIGINT'],
      ['jersey_number', 'INTEGER'],
      ['dob', 'DATE'],
      ['external_id', 'VARCHAR(255)']
    ];

    for (const [col, definition] of columns) {
      console.log(`Checking column: ${col}`);
      await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS ${col} ${definition};`);
    }

    console.log('Schema update successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
