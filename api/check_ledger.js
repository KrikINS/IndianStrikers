
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- DB Check ---');
    
    // 1. Check player_match_stats count
    const { count, error: countErr } = await supabase
        .from('player_match_stats')
        .select('*', { count: 'exact', head: true });
    console.log('Total Ledger records:', count);

    // 2. Check Anas Ummer specifically
    const { data: anas } = await supabase.from('players').select('id, name, runs_scored').eq('name', 'Anas Ummer').single();
    if (anas) {
        console.log(`Anas Info: ID=${anas.id}, Runs=${anas.runs_scored}`);
        const { data: anasStats } = await supabase.from('player_match_stats').select('*').eq('player_id', anas.id);
        console.log(`Anas Ledger entries: ${anasStats?.length || 0}`);
        if (anasStats) {
            anasStats.forEach(s => console.log(`  - Match: ${s.match_id}, Runs: ${s.runs}`));
        }
    }

    // 3. Check for any 'NaN' or 'undefined' values
    const { data: badStats } = await supabase.from('player_match_stats').select('*').or('runs.is.null,player_id.is.null');
    if (badStats?.length) {
      console.log('Found stats with NULLs:', badStats.length);
    }
}

check();
