const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function recalculate() {
    console.log('--- STARTING SYSTEM-WIDE CAREER RECALCULATION ---');

    // 1. Get all players
    const { data: players, error: pErr } = await supabase.from('players').select('id, name');
    if (pErr) {
        console.error('Failed to fetch players:', pErr.message);
        return;
    }

    for (const player of players) {
        const playerId = player.id;
        console.log(`Recalculating Career for ${player.name}...`);

        // A: Fetch Legacy Baseline
        const { data: legacy, error: legErr } = await supabase
            .from('player_legacy_stats')
            .select('*')
            .eq('player_id', playerId)
            .single();

        // B: Fetch App Match Ledger (Exclude Sandbox/Test matches)
        const { data: allStats, error: sumErr } = await supabase
            .from('player_match_stats')
            .select(`
                *,
                matches!inner (
                    is_test
                )
            `)
            .eq('player_id', playerId)
            .eq('matches.is_test', false);

        if (sumErr) {
            console.warn(`Failed to fetch ledger for ${player.name}:`, sumErr.message);
            continue;
        }

        const legacyStats = legacy || { 
            runs: 0, balls: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, 
            matches: 0, innings: 0, not_outs: 0, highest_score: 0, 
            overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0, 
            four_wickets: 0, five_wickets: 0, best_bowling: '0/0' 
        };

        // BATTING SUMMATION
        const totalBatRuns = allStats.reduce((sum, s) => sum + (Number(s.runs) || 0), 0) + (Number(legacyStats.runs) || 0);
        const totalBatBalls = allStats.reduce((sum, s) => sum + (Number(s.balls) || 0), 0) + (Number(legacyStats.balls) || 0);
        const totalBat4s = allStats.reduce((sum, s) => sum + (Number(s.fours) || 0), 0) + (Number(legacyStats.fours) || 0);
        const totalBat6s = allStats.reduce((sum, s) => sum + (Number(s.sixes) || 0), 0) + (Number(legacyStats.sixes) || 0);
        const total100s = allStats.reduce((sum, s) => sum + (Number(s.hundreds) || 0), 0) + (Number(legacyStats.hundreds) || 0);
        const total50s = allStats.reduce((sum, s) => sum + (Number(s.fifties) || 0), 0) + (Number(legacyStats.fifties) || 0);
        const totalDucks = allStats.reduce((sum, s) => sum + (Number(s.ducks) || 0), 0) + (Number(legacyStats.ducks) || 0);
        const totalNotOuts = allStats.filter(s => s.is_not_out || s.status === 'Not Out' || s.status === 'not out').length + (Number(legacyStats.not_outs) || 0);
        
        const totalMatches = allStats.reduce((sum, s) => {
            if (s.status?.startsWith('HISTORICAL:')) {
                return sum + (parseInt(s.status.split(':')[1]) || 1);
            }
            return sum + 1;
        }, 0) + (Number(legacyStats.matches) || 0);
        
        const totalInnings = allStats.filter(s => (Number(s.runs) > 0 || Number(s.balls) > 0)).length + (Number(legacyStats.innings) || 0);
        const batAvg = (totalInnings - totalNotOuts) > 0 ? (totalBatRuns / (totalInnings - totalNotOuts)) : totalBatRuns;
        const batSR = totalBatBalls > 0 ? (totalBatRuns / totalBatBalls) * 100 : 0;

        // BOWLING SUMMATION
        const totalWickets = allStats.reduce((sum, s) => sum + (Number(s.wickets) || 0), 0) + (Number(legacyStats.wickets) || 0);
        const totalBowlRuns = allStats.reduce((sum, s) => sum + (Number(s.runs_conceded) || 0), 0) + (Number(legacyStats.runs_conceded) || 0);
        const totalBowlOvers = allStats.reduce((sum, s) => sum + (Number(s.overs_bowled) || 0), 0) + (Number(legacyStats.overs_bowled) || 0);
        const totalMaidens = allStats.reduce((sum, s) => sum + (Number(s.maidens) || 0), 0) + (Number(legacyStats.maidens) || 0);
        const total4W = allStats.reduce((sum, s) => sum + (Number(s.four_wickets) || 0), 0) + (Number(legacyStats.four_wickets) || 0);
        const total5W = allStats.reduce((sum, s) => sum + (Number(s.five_wickets) || 0), 0) + (Number(legacyStats.five_wickets) || 0);
        
        // BBI logic
        const allBBI = allStats.map(s => s.best_bowling).filter(b => b && b !== '0/0');
        if (legacyStats.best_bowling && legacyStats.best_bowling !== '0/0') allBBI.push(legacyStats.best_bowling);
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

        const bowlAvg = totalWickets > 0 ? totalBowlRuns / totalWickets : 0;
        const bowlEco = totalBowlOvers > 0 ? totalBowlRuns / totalBowlOvers : 0;
        const bowlSR = totalWickets > 0 ? (totalBowlOvers * 6) / totalWickets : 0;

        const maxAppScore = Math.max(...allStats.filter(s => !s.status?.startsWith('HISTORICAL:')).map(s => Number(s.runs) || 0), 0);
        const maxScore = Math.max(maxAppScore, Number(legacyStats.highest_score) || 0);

        // Update profile
        await supabase
            .from('players')
            .update({
                runs_scored: totalBatRuns,
                wickets_taken: totalWickets,
                matches_played: totalMatches,
                batting_stats: {
                    matches: totalMatches,
                    innings: totalInnings,
                    runs: totalBatRuns,
                    balls: totalBatBalls,
                    fours: totalBat4s,
                    sixes: totalBat6s,
                    notOuts: totalNotOuts,
                    highestScore: String(maxScore),
                    average: parseFloat(batAvg.toFixed(2)),
                    strikeRate: parseFloat(batSR.toFixed(2)),
                    hundreds: total100s,
                    fifties: total50s,
                    ducks: totalDucks
                },
                bowling_stats: {
                    matches: totalMatches,
                    innings: allStats.filter(s => (Number(s.overs_bowled) > 0)).length + (Number(legacyStats.wickets) > 0 || Number(legacyStats.runs_conceded) > 0 ? (Number(legacyStats.matches) || 1) : 0),
                    overs: parseFloat(totalBowlOvers.toFixed(1)),
                    runs: totalBowlRuns,
                    wickets: totalWickets,
                    maidens: totalMaidens,
                    average: parseFloat(bowlAvg.toFixed(2)),
                    economy: parseFloat(bowlEco.toFixed(2)),
                    strikeRate: parseFloat(bowlSR.toFixed(2)),
                    bestBowling: bestBBI,
                    fourWickets: total4W,
                    fiveWickets: total5W
                },
                updated_at: new Date()
            })
            .eq('id', playerId);
    }
    console.log('--- CAREER RECALCULATION COMPLETE ---');
}

recalculate();
