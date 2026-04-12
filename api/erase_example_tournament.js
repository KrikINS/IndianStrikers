
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:AppTerra%23INS@/postgres?host=/cloudsql/project-9c12c6c8-cfd5-47ed-bfc:asia-south1:strikers-pulse-db'
});

async function eraseExampleTournament() {
  try {
    console.log('Searching for "Example Tournament"...');
    const res = await pool.query("SELECT id FROM tournaments WHERE name ILIKE 'Example Tournament%'");
    
    if (res.rows.length === 0) {
      console.log('No matches found for "Example Tournament".');
    } else {
      for (const row of res.rows) {
        console.log(`Deleting tournament ID: ${row.id}`);
        await pool.query('DELETE FROM tournaments WHERE id = $1', [row.id]);
      }
      console.log('Successfully erased example tournament(s).');
    }
  } catch (err) {
    console.error('Error erasing tournament:', err);
  } finally {
    await pool.end();
  }
}

eraseExampleTournament();
