require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
  console.log('Migrating app_users table to include can_score feature flag...');
  
  const addColumnQuery = `
    ALTER TABLE app_users 
    ADD COLUMN IF NOT EXISTS can_score BOOLEAN DEFAULT FALSE;
  `;
  
  const { error } = await db.query(addColumnQuery);
  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  console.log('Migration successful!');
  process.exit(0);
}

migrate();
