
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Database Extraction Started ---');
  console.log('Source:', supabaseUrl);

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
      console.warn(`Warning: Could not fetch data for ${table}:`, rError.message);
      continue;
    }

    if (rows && rows.length > 0) {
      sqlDump += `-- Data for ${table} (${rows.length} rows)\n`;
      // We'll generate simple INSERTs.
      // Note: This assumes the tables exist on the target with the same structure.
      
      const columns = Object.keys(rows[0]);
      
      rows.forEach(row => {
        const vals = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          if (typeof val === 'boolean') return val;
          return val;
        });
        sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${vals.join(', ')});\n`;
      });
      sqlDump += '\n';
    } else {
      console.log(`Table ${table} is empty.`);
    }
  }

  fs.writeFileSync('../full_dump.sql', sqlDump);
  console.log('--- Extraction Complete: ../full_dump.sql created ---');
}

run().catch(console.error);
