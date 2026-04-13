require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function fixSequences() {
  try {
    console.log('Fixing sequences for players and app_users...');
    
    // Fix players id sequence
    await db.query(`
      SELECT setval(pg_get_serial_sequence('players', 'id'), coalesce(max(id), 0) + 1, false) FROM players;
    `);
    
    // Fix app_users id sequence
    await db.query(`
      SELECT setval(pg_get_serial_sequence('app_users', 'id'), coalesce(max(id), 0) + 1, false) FROM app_users;
    `);

    console.log('Sequences resynced successfully.');
  } catch (error) {
    console.error('Sequence fix failed:', error);
    // If pg_get_serial_sequence fails, it might not be a serial column. 
    // Let's try matching specifically for common naming conventions if that fails.
  } finally {
    process.exit();
  }
}

fixSequences();
