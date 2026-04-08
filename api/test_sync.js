
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, './.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncPlayer(playerId) {
    try {
        console.log(`Syncing player ${playerId}...`);
        
        const { data: legacyBaseline } = await supabase.from('player_legacy_stats').select('*').eq('player_id', playerId).single();
        if (!legacyBaseline) {
            console.log('No legacy stats found.');
            return;
        }

        const { data: m } = await supabase.from('player_match_stats').select('*').eq('player_id', playerId);
        const l = legacyBaseline;

        const totalRuns = (m || []).reduce((s, row) => s + (Number(row.runs) || 0), 0) + (Number(l.runs) || 0);
        const totalWickets = (m || []).reduce((s, row) => s + (Number(row.wickets) || 0), 0) + (Number(l.wickets) || 0);
        const totalMatches = (m || []).reduce((s, row) => s + (row.status?.startsWith('HISTORICAL:') ? (parseInt(row.status.split(':')[1]) || 1) : 1), 0) + (Number(l.matches) || 0);
        const totalInnings = (m || []).filter(row => (Number(row.runs) > 0 || Number(row.balls) > 0)).length + (Number(l.innings) || 0);
        const totalNO = (m || []).filter(row => row.is_not_out).length + (Number(l.not_outs) || 0);
        const totalBalls = (m || []).reduce((s, row) => s + (Number(row.balls) || 0), 0) + (Number(l.balls) || 0);
        const totalFours = (m || []).reduce((s, row) => s + (Number(row.fours) || 0), 0) + (Number(l.fours) || 0);
        const totalSixes = (m || []).reduce((s, row) => s + (Number(row.sixes) || 0), 0) + (Number(l.sixes) || 0);
        const total100s = (m || []).reduce((s, row) => s + (Number(row.hundreds) || 0), 0) + (Number(l.hundreds) || 0);
        const total50s = (m || []).reduce((s, row) => s + (Number(row.fifties) || 0), 0) + (Number(l.fifties) || 0);
        const totalDucks = (m || []).reduce((s, row) => s + (Number(row.ducks) || 0), 0) + (Number(l.ducks) || 0);

        const totalBowlRuns = (m || []).reduce((s, row) => s + (Number(row.runs_conceded) || 0), 0) + (Number(l.runs_conceded) || 0);
        const totalBowlOvers = (m || []).reduce((s, row) => s + (Number(row.overs_bowled) || 0), 0) + (Number(l.overs_bowled) || 0);
        const totalMaidens = (m || []).reduce((s, row) => s + (Number(row.maidens) || 0), 0) + (Number(l.maidens) || 0);
        const total4W = (m || []).reduce((s, row) => s + (Number(row.four_wickets) || 0), 0) + (Number(l.four_wickets) || 0);
        const total5W = (m || []).reduce((s, row) => s + (Number(row.five_wickets) || 0), 0) + (Number(l.five_wickets) || 0);
        const totalBowlInnings = (m || []).filter(row => (Number(row.overs_bowled) > 0)).length + (Number(l.bowling_innings) || 0);
        const totalWides = (m || []).reduce((s, row) => s + (Number(row.wides) || 0), 0) + (Number(l.wides) || 0);
        const totalNoBalls = (m || []).reduce((s, row) => s + (Number(row.no_balls) || 0), 0) + (Number(l.no_balls) || 0);

        const allBBI = (m || []).map(row => row.best_bowling).filter(Boolean);
        if (l.best_bowling && l.best_bowling !== '0/0') allBBI.push(l.best_bowling);
        let bestBBI = '0/0';
        if (allBBI.length > 0) {
            allBBI.sort((a,b) => {
                const [wA, rA] = a.split('/').map(Number);
                const [wB, rB] = b.split('/').map(Number);
                if (wB !== wA) return wB - wA;
                return rA - rB;
            });
            bestBBI = allBBI[0];
        }

        const batAvg = (totalInnings - totalNO) > 0 ? (totalRuns / (totalInnings - totalNO)) : totalRuns;
        const batSR = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
        const bowlAvg = totalWickets > 0 ? totalBowlRuns / totalWickets : 0;
        const bowlEco = totalBowlOvers > 0 ? totalBowlRuns / totalBowlOvers : 0;
        const bowlSR = totalWickets > 0 ? (totalBowlOvers * 6) / totalWickets : 0;
        const maxScore = Math.max(...(m || []).map(row => Number(row.runs) || 0), Number(l.highest_score) || 0);

        const updateData = {
            runs_scored: totalRuns,
            wickets_taken: totalWickets,
            matches_played: totalMatches,
            batting_stats: {
                matches: totalMatches, innings: totalInnings, runs: totalRuns, balls: totalBalls,
                fours: totalFours, sixes: totalSixes, notOuts: totalNO, highestScore: String(maxScore),
                average: parseFloat(batAvg.toFixed(2)), strikeRate: parseFloat(batSR.toFixed(2)),
                hundreds: total100s, fifties: total50s, ducks: totalDucks
            },
            bowling_stats: {
                matches: totalMatches, innings: totalBowlInnings, overs: parseFloat(totalBowlOvers.toFixed(1)), runs: totalBowlRuns, 
                wickets: totalWickets, maidens: totalMaidens, average: parseFloat(bowlAvg.toFixed(2)),
                economy: parseFloat(bowlEco.toFixed(2)), strikeRate: parseFloat(bowlSR.toFixed(2)),
                bestBowling: bestBBI, fourWickets: total4W, fiveWickets: total5W,
                wides: totalWides, no_balls: totalNoBalls
            },
            updated_at: new Date()
        };

        const { error } = await supabase.from('players').update(updateData).eq('id', playerId);
        if (error) throw error;
        console.log(`Sync complete for player ${playerId}! Innings: ${totalBowlInnings}, Wides: ${totalWides}`);
    } catch (err) {
        console.error('Error during sync:', err);
    }
}

syncPlayer(24);
