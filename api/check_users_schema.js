require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function checkSchema() {
  try {
    const res = await db.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'app_users'");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
