
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    const { data: players, error } = await supabase.from('players').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(players[0], null, 2));
    }
}

debug();
