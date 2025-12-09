
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('Testing Supabase connection...');
    console.log('URL:', process.env.SUPABASE_URL ? 'Filled' : 'Missing');

    const { data: players, error: pError } = await supabase.from('players').select('count', { count: 'exact', head: true });
    if (pError) console.error('Players Error:', pError);
    else console.log('Players Status:', players); // might be null if head:true, but usually gives count or status 200

    const { data, error } = await supabase.from('players').select('*').limit(5);
    if (error) {
        console.error('Error fetching players:', error);
    } else {
        console.log('Players found:', data.length);
        if (data.length > 0) console.log('First player:', data[0].name);
    }

    const { data: matches, error: mError } = await supabase.from('matches').select('*').limit(5);
    if (mError) {
        console.error('Error fetching matches:', mError);
    } else {
        console.log('Matches found:', matches.length);
    }
}

test();
