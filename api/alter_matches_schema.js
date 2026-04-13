require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function alterTable() {
  try {
    console.log('Adding live_data column...');
    await db.query('ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_data JSONB');
    console.log('Column live_data added successfully.');
  } catch (error) {
    console.error('Failed to alter table:', error);
  } finally {
    process.exit();
  }
}

alterTable();
