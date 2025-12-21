require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('Connecting to Supabase...');
    console.log('URL:', supabaseUrl);

    const { data, error } = await supabase.from('app_users').select('id,username,role');

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('Success! Users found:', data.length);
        console.log(data);
    }
}

checkUsers();
