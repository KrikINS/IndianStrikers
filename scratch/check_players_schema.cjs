require('dotenv').config({ path: './api/.env' });
const db = require('./api/db');

async function checkSchema() {
  try {
    const res = await db.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'players'");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
