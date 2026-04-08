const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function rebuild() {
    console.log('--- Rebuilding Ledger (player_match_stats) from Matches ---');
    
    // 1. Get all matches with performers
    const { data: matches, error: mErr } = await supabase
        .from('matches')
        .select('id, performers, tournament, date');
    
    if (mErr) throw mErr;
    console.log(`Found ${matches?.length || 0} matches.`);

    let entries = [];
    for (const match of matches) {
        if (!match.performers || !Array.isArray(match.performers)) continue;
        
        for (const perf of match.performers) {
            if (!perf.playerId) continue;
            
            entries.push({
                match_id: match.id,
                player_id: perf.playerId,
                runs: Number(perf.runs || 0),
                balls: Number(perf.balls || 0),
                fours: Number(perf.fours || 0),
                sixes: Number(perf.sixes || 0),
                overs_bowled: Number(perf.bowlingOvers || 0),
                runs_conceded: Number(perf.bowlingRuns || 0),
                wickets: Number(perf.wickets || 0),
                maidens: Number(perf.maidens || 0),
                hundreds: Number(perf.runs) >= 100 ? 1 : 0,
                fifties: Number(perf.runs) >= 50 && Number(perf.runs) < 100 ? 1 : 0,
                ducks: Number(perf.runs) === 0 && perf.outHow && perf.outHow !== 'Not Out' && perf.outHow !== 'Did Not Bat' ? 1 : 0,
                four_wickets: Number(perf.wickets) === 4 ? 1 : 0,
                five_wickets: Number(perf.wickets) >= 5 ? 1 : 0,
                best_bowling: `${perf.wickets || 0}/${perf.bowlingRuns || 0}`,
                status: perf.outHow || (perf.isNotOut ? 'Not Out' : 'Out')
            });
        }
    }

    console.log(`Reconstructing ${entries.length} ledger entries...`);
    
    // Chunked upsert to avoid request limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        const { error: upsertErr } = await supabase
            .from('player_match_stats')
            .upsert(chunk, { onConflict: 'match_id, player_id' });
        
        if (upsertErr) {
            console.error(`Error in chunk ${i/CHUNK_SIZE}:`, upsertErr.message);
        } else {
            console.log(`Uploaded chunk ${i/CHUNK_SIZE + 1} (${chunk.length} rows)`);
        }
    }

    console.log('--- REBUILD COMPLETE ---');
}

rebuild();
