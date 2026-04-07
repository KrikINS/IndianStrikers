
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CSV_PATH = path.join(__dirname, '..', 'INS_Squad_Stats_Backup_2026-04-07.csv');

async function restore() {
    console.log('Restoring player stats from CSV...');
    
    if (!fs.existsSync(CSV_PATH)) {
        console.error('CSV not found at:', CSV_PATH);
        return;
    }

    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        // Use a simpler parser for this CSV since we know the format
        const row = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());

        if (row.length < 10) continue;

        const name = row[0];
        const role = row[1];
        const battingStyle = row[2];
        const bowlingStyle = row[3];
        const jersey = row[4];
        const matches = parseInt(row[5]) || 0;
        const bRuns = parseInt(row[6]) || 0;
        const bInnings = parseInt(row[7]) || 0;
        const bNotOuts = parseInt(row[8]) || 0;
        const bSR = parseFloat(row[9]) || 0;
        const bAVE = parseFloat(row[10]) || 0;
        const bHighest = row[11];
        const b4s = parseInt(row[12]) || 0;
        const b6s = parseInt(row[13]) || 0;
        const boRuns = parseInt(row[14]) || 0;
        const boInnings = parseInt(row[15]) || 0;
        const boWickets = parseInt(row[16]) || 0;
        const boECON = parseFloat(row[17]) || 0;
        const boSR = parseFloat(row[18]) || 0;
        const boBest = row[19];
        const boMaidens = parseInt(row[20]) || 0;
        const boDots = parseInt(row[21]) || 0;

        if (name === 'Anas Ummer') {
            console.log(`Debug Anas: Matches=${matches}, Runs=${bRuns}`);
        }

        const battingStats = {
            matches: matches,
            innings: bInnings,
            notOuts: bNotOuts,
            runs: bRuns,
            balls: 0,
            average: bAVE,
            strikeRate: bSR,
            highestScore: bHighest === 'undefined' ? '0' : bHighest,
            hundreds: 0,
            fifties: 0,
            ducks: 0,
            fours: b4s,
            sixes: b6s
        };

        const bowlingStats = {
            matches: matches,
            innings: boInnings,
            overs: 0,
            maidens: boMaidens,
            runs: boRuns,
            wickets: boWickets,
            average: 0,
            economy: boECON,
            strikeRate: boSR,
            bestBowling: boBest === 'undefined' ? '0/0' : boBest,
            fourWickets: 0,
            fiveWickets: 0,
            dotBalls: boDots,
            wides: 0,
            noBalls: 0
        };

        const { error } = await supabase
            .from('players')
            .update({
                matches_played: matches,
                runs_scored: bRuns,
                wickets_taken: boWickets,
                batting_stats: battingStats,
                bowling_stats: bowlingStats,
                role: role === 'null' ? null : role,
                batting_style: battingStyle === 'null' ? null : battingStyle,
                bowling_style: bowlingStyle === 'null' ? null : bowlingStyle,
                jersey_number: parseInt(jersey) || null,
                updated_at: new Date()
            })
            .eq('name', name);

        if (error) {
            console.error(`Error updating ${name}:`, error.message);
        }
    }
    console.log('Restoration complete.');
}

restore();
