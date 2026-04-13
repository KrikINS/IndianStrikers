require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  try {
    console.log('Adding email and is_first_login to app_users...');
    await db.query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;');
    await db.query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;');
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
