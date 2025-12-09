
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    console.log('Checking database content...');

    // Check Opponents
    const { data: opponents, error: oError } = await supabase.from('opponents').select('*');
    if (oError) console.error('Opponents Error:', oError);
    else {
        console.log(`Opponents Count: ${opponents.length}`);
        if (opponents.length > 0) console.log('Sample Opponent:', opponents[0]);
    }

    // Check Tournament Table
    const { data: table, error: tError } = await supabase.from('tournament_table').select('*');
    if (tError) console.error('Tournament Table Error:', tError);
    else {
        console.log(`Tournament Table Rows: ${table.length}`);
        if (table.length > 0) console.log('Sample Row:', table[0]);
    }
}

checkData();
