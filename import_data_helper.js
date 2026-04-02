const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });

async function importData() {
    // We'll use the target project URL and the service role key provided in last turn
    const SUPABASE_URL = 'https://udwajojjcacaecaeccez.supabase.co';
    const SUPABASE_KEY = process.env.TARGET_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkd2Fqb2pqY2FjYWVjYWVjY2V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEyMjY0OCwiZXhwIjoyMDkwNjk4NjQ4fQ.LK8TZB3z3bmp2ChBbmZKwcFEs36sA3X0_mEi3poNM3Y';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('Reading full_dump.sql...');
    const sqlFile = path.join(__dirname, 'full_dump.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split SQL by semicolon, but be careful with values containing semicolons (though simple INSERTs should be fine)
    // A better way is to split by "INSERT INTO" or just try to execute the whole thing if not too large.
    // For 1.9MB, let's try to send it in blocks of INSERT statements.
    
    // We'll use a regex to split into individual INSERT statements
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

    console.log(`Executing ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        // Log progress every 50 statements
        if (i % 50 === 0) {
            console.log(`Progress: ${i}/${statements.length}`);
        }
        
        try {
            const { error } = await supabase.rpc('exec_sql', { query_text: stmt });
            if (error) {
                // If RPC fails (maybe doesn't exist), fall back to raw query via tool or another method
                // Wait, exec_sql RPC usually doesn't exist by default.
                // We should use the MCP tool instead in a loop.
                throw error;
            }
        } catch (e) {
            console.error(`Error executing statement ${i}:`, e.message);
            // Since we can't easily run raw SQL via supabase-js without an RPC, 
            // we will use the MCP tool from this script if possible? No.
            // I will use this script to just split the file and output the results.
        }
    }
}
