const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://udwajojjcacaecaeccez.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkd2Fqb2pqY2FjYWVjYWVjY2V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEyMjY0OCwiZXhwIjoyMDkwNjk4NjQ4fQ.LK8TZB3z3bmp2ChBbmZKwcFEs36sA3X0_mEi3poNM3Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fixing Supabase schema...');
  
  const { data, error } = await supabase.rpc('execute_sql_query', {
    sql_query: `
      ALTER TABLE grounds ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE grounds ADD COLUMN IF NOT EXISTS capacity INTEGER;
      ALTER TABLE grounds ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `
  });
  
  if (error) {
    console.error('Migration failed:', error);
    // If RPC fails (not enabled), we can't do DDL through the JS driver usually unless it's a specific RPC.
    // However, I can try doing it through a REST call if the API supports it.
  } else {
    console.log('Migration successful or already applied!');
  }
}

run();
