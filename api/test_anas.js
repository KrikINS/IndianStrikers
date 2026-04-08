const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    try {
        console.log('--- Anas Stats Audit ---');
        const { data: p, error: pErr } = await supabase.from('players').select('*').ilike('name', '%Anas%').single();
        if (pErr) throw pErr;
        
        const { data: m, error: mErr } = await supabase.from('player_match_stats').select('runs, match_id').eq('player_id', p.id);
        if (mErr) throw mErr;

        const { data: legacy, error: lErr } = await supabase.from('player_legacy_stats').select('*').eq('player_id', p.id).single();

        console.log('Player Profile Name:', p.name);
        console.log('Profile Total Runs:', p.runs_scored);
        console.log('Batting Stats Runs:', p.batting_stats?.runs);
        console.log('\n--- Match Stats Records ---');
        m.forEach(rec => console.log(`Match ${rec.match_id}: ${rec.runs} runs`));
        
        console.log('\n--- Legacy Baseline ---');
        console.log(`Legacy Runs: ${legacy?.runs || 0}`);

        const MATCH_ID = 'ae3ff59d20';
        const { data: match, error: matchErr } = await supabase.from('matches').select('performers').eq('id', MATCH_ID).single();
        if (matchErr) throw matchErr;

        console.log(`\n--- Match Table Metadata (Match ${MATCH_ID}) ---`);
        const anasInMatch = match.performers?.find(p => p.playerName?.includes('Anas') || p.playerId === 8);
        if (anasInMatch) {
            console.log('Performers JSON score for Anas:', anasInMatch.runs);
        } else {
            console.log('Anas not found in performers JSON');
        }

        console.log('\n--- Final Verdict ---');
        if (anasInMatch?.runs == 66 && p.runs_scored != (4250 + 66)) {
             console.log('❌ MATCH DATA IS UPDATED, BUT CAREER SYNC FAILED');
        } else if (anasInMatch?.runs == 72) {
             console.log('❌ MATCH DATA ITSELF IS STILL 72. SAVE FAILED.');
        } else {
             console.log('Checking logic...');
        }
    } catch (e) {
        console.error('Audit Error:', e.message);
    }
}
check();
