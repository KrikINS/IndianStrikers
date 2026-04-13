require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  try {
    console.log('Ensuring players column exists in opponents table...');
    await db.query(`
      ALTER TABLE opponents ADD COLUMN IF NOT EXISTS players JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
