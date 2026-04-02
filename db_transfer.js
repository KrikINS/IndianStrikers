
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ./api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Database Extraction Started ---');
  console.log('Source:', supabaseUrl);

  // 1. Get all tables in public schema
  const { data: tables, error: tError } = await supabase.rpc('get_tables_info'); 
  // Wait, I might not have this RPC. I'll use a direct SQL query via a known table if possible, 
  // or just hardcode the ones I found in api/index.js if needed.
  // Actually, I'll try to use a generic SQL execution if I can, but Supabase JS doesn't have raw SQL.
  // I'll use the ones found in api/index.js.
  
  const tablesToExport = [
    'app_users',
    'players',
    'matches',
    'opponents',
    'strategies',
    'app_settings',
    'tournament_table',
    'membership_requests',
    'memories'
  ];

  let sqlDump = '-- Supabase Database Dump\n';
  sqlDump += '-- Generated at: ' + new Date().toISOString() + '\n\n';

  for (const table of tablesToExport) {
    console.log(`Extracting table: ${table}...`);
    
    // Attempt to get data
    const { data: rows, error: rError } = await supabase.from(table).select('*');
    
    if (rError) {
      console.error(`Error fetching data for ${table}:`, rError.message);
      continue;
    }

    if (rows && rows.length > 0) {
      sqlDump += `-- Data for ${table} (${rows.length} rows)\n`;
      // We don't have the schema here, so we'll generate basic INSERTs.
      // We'll rely on the user having the tables created, 
      // OR we recreate them based on the first row's keys.
      
      const columns = Object.keys(rows[0]);
      
      // Simple CREATE TABLE if we want to be bold, but better to just generate INSERTs.
      // I'll try to guess types.
      
      rows.forEach(row => {
        const vals = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return val;
        });
        sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${vals.join(', ')});\n`;
      });
      sqlDump += '\n';
    } else {
      console.log(`Table ${table} is empty.`);
    }
  }

  fs.writeFileSync('full_dump.sql', sqlDump);
  console.log('--- Extraction Complete: full_dump.sql created ---');
}

run().catch(console.error);
