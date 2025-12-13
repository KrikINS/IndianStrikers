require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

console.log("Testing connection to:", url);
const supabase = createClient(url, key);

async function test() {
    console.log("Fetching matches (limit 1)...");
    const { data, error } = await supabase.from('matches').select('id').limit(1);
    if (error) {
        console.error("Connection Failed:", error);
    } else {
        console.log("Connection Success! Data:", data);
    }
}

test();
