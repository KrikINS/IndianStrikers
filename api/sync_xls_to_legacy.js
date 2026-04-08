const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
    console.log('--- STARTING EXCEL TO LEGACY SYNC ---');
    const filePath = path.join(__dirname, '..', 'INS_Squad_Statistics_2026-04-08.xls');
    
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet); // Use keyed objects for easier mapping

    for (const row of data) {
        const playerName = row['Player Name'];
        if (!playerName) continue;

        console.log(`Processing ${playerName}...`);

        // Find Player ID
        const { data: p, error: pErr } = await supabase
            .from('players')
            .select('id')
            .eq('name', playerName)
            .single();

        if (pErr || !p) {
            console.warn(`⚠️ Player not found in database: ${playerName}`);
            continue;
        }

        // Map Excel Fields to expanded player_legacy_stats
        // Note: Missing milestones (100s, 50s, etc) default to 0 as they aren't in the Excel
        const legacyData = {
            player_id: p.id,
            runs: parseInt(row['Batting Runs']) || 0,
            balls: 0, // Not in Excel
            fours: parseInt(row['4s']) || 0,
            sixes: parseInt(row['6s']) || 0,
            innings: parseInt(row['Innings']) || 0,
            not_outs: parseInt(row['Not Outs']) || 0,
            highest_score: parseInt(row['Highest Score']) || 0,
            overs_bowled: 0, // Need to derive from Bowling Innings/Economy if possible, but Excel has no pure Overs col
            runs_conceded: parseInt(row['Runs Conceded']) || 0,
            wickets: parseInt(row['Wickets Taken']) || 0,
            maidens: parseInt(row['Maidens']) || 0,
            best_bowling: row['Best Bowling'] || '0/0',
            matches: parseInt(row['Matches Played']) || 0,
            updated_at: new Date().toISOString()
        };

        const { error: upsertErr } = await supabase
            .from('player_legacy_stats')
            .upsert(legacyData, { onConflict: 'player_id' });

        if (upsertErr) {
            console.error(`❌ Failed to sync legacy stats for ${playerName}:`, upsertErr.message);
        } else {
            console.log(`✅ Synced ${playerName}`);
        }
    }

    console.log('\n--- SYNC COMPLETE. RUNNING CAREER RECALCULATION ---');
    // We execute the recalculation logic in index.js for each player to update the 'players' profile
    // For simplicity, we can just trigger a match finalize or run a separate rebuild script
}

sync();
