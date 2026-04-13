require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function audit() {
  try {
    const { data, error } = await db.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'strategies'
    `);
    if (error) throw error;
    console.log('Strategies table columns:');
    console.table(data);
  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    process.exit();
  }
}

audit();
