const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFinalize() {
    const matchId = 'ae734935-f62c-4b06-b45f-c1933ff59d20';
    const playerId = 8; // Anas Ummer
    const newRuns = 67;

    console.log(`Attempting to update player ${playerId} runs to ${newRuns} for match ${matchId}...`);

    // Simulate what the finalize route does
    const { data: actualPlayer, error: pErr } = await supabase
        .from('players')
        .select('id, name')
        .eq('id', playerId)
        .single();

    if (pErr) {
        console.error('Player not found:', pErr.message);
        return;
    }

    console.log(`Found player: ${actualPlayer.name} (ID: ${actualPlayer.id})`);

    const { error: upsertErr } = await supabase
        .from('player_match_stats')
        .upsert([{
            match_id: matchId,
            player_id: actualPlayer.id,
            runs: newRuns,
            balls: 23,
            fours: 7,
            sixes: 5,
            status: 'Out',
            wickets: 0,
            runs_conceded: 0,
            overs_bowled: 0,
            maidens: 0,
            hundreds: 0,
            fifties: 1,
            ducks: 0,
            updated_at: new Date().toISOString()
        }], { onConflict: 'match_id, player_id' });

    if (upsertErr) {
        console.error('Upsert failed:', upsertErr.message);
        return;
    }

    console.log('Upsert successful in player_match_stats.');

    // Now trigger recalculation (simulating line 367 in index.js)
    try {
        await recalculateCareerStats(actualPlayer.id);
        console.log('Recalculation successful.');
    } catch (err) {
        console.error('Recalculation failed:', err.message);
    }
}

// Minimal implementation of the engine to test locally
async function recalculateCareerStats(playerId) {
    console.log(`[SyncEngine] Recalculating career for Player ID: ${playerId}...`);
    
    const { data: allMatchStats } = await supabase.from('player_match_stats').select('*').eq('player_id', playerId);
    const { data: legacyBaseline } = await supabase.from('player_legacy_stats').select('*').eq('player_id', playerId).single();
    
    const l = legacyBaseline || { 
        runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, matches: 0, innings: 0, 
        not_outs: 0, highest_score: 0, bowling_innings: 0, overs_bowled: 0, 
        runs_conceded: 0, maidens: 0, hundreds: 0, fifties: 0, ducks: 0, 
        four_wickets: 0, five_wickets: 0, wides: 0, no_balls: 0, best_bowling: '0/0' 
    };
    const m = allMatchStats || [];

    const totalRuns = m.reduce((s, row) => s + (Number(row.runs) || 0), 0) + (Number(l.runs) || 0);
    const totalWickets = m.reduce((s, row) => s + (Number(row.wickets) || 0), 0) + (Number(l.wickets) || 0);
    
    console.log(`Calculated Total Runs: ${totalRuns} (Legacy: ${l.runs}, Match Sum: ${m.reduce((s, row) => s + (Number(row.runs) || 0), 0)})`);

    // Update the players table profile
    const { error: upErr } = await supabase.from('players').update({
        runs_scored: totalRuns,
        wickets_taken: totalWickets,
        updated_at: new Date()
    }).eq('id', playerId);

    if (upErr) throw upErr;
    console.log(`[SyncEngine] ✅ Career recalculated for ${playerId}`);
}

testFinalize();
