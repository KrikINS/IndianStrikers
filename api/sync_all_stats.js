require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

/**
 * COPY OF recalculateCareerStats from api/index.js
 * (In a real app, this should be a shared utility)
 */
async function recalculateCareerStats(playerId) {
    console.log(`[Sync] Recalculating Player ID: ${playerId}...`);
    
    const { data: participationStats, error: partError } = await db.query(
        `SELECT 
            pms.*, 
            m.status as match_status, 
            m.is_test 
         FROM matches m
         LEFT JOIN player_match_stats pms ON (m.id = pms.match_id AND pms.player_id = $1::BIGINT)
         WHERE (
            pms.player_id IS NOT NULL 
            OR m.home_team_xi @> jsonb_build_array($1::text)
            OR m.home_team_xi @> jsonb_build_array($1::int)
            OR m.opponent_team_xi @> jsonb_build_array($1::text)
            OR m.opponent_team_xi @> jsonb_build_array($1::int)
         )
         AND (m.is_test IS NOT TRUE)
         AND (m.status != 'upcoming' AND m.status != 'Upcoming')`,
        [playerId]
    );

    if (partError) throw partError;

    const { data: legacyBaseline } = await db.getOne('SELECT * FROM player_legacy_stats WHERE player_id = $1', [playerId]);
    
    const l = legacyBaseline || { 
        runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, matches: 0, innings: 0, 
        not_outs: 0, highest_score: 0, bowling_innings: 0, overs_bowled: 0, 
        runs_conceded: 0, maidens: 0, hundreds: 0, fifties: 0, ducks: 0, 
        four_wickets: 0, five_wickets: 0, wides: 0, no_balls: 0, best_bowling: '0/0' 
    };
    const m = participationStats || [];

    const toBalls = (ov) => {
        const floatOv = parseFloat(ov) || 0;
        const completeOvers = Math.floor(floatOv);
        const extraBalls = Math.round((floatOv % 1) * 10);
        return (completeOvers * 6) + extraBalls;
    };
    const fromBalls = (balls) => {
        const ov = Math.floor(balls / 6);
        const rem = balls % 6;
        return parseFloat(`${ov}.${rem}`);
    };

    const totalRuns = m.reduce((s, row) => s + (Number(row.runs) || 0), 0) + (Number(l.runs) || 0);
    const totalWickets = m.reduce((s, row) => s + (Number(row.wickets) || 0), 0) + (Number(l.wickets) || 0);
    
    const totalMatches = m.reduce((s, row) => {
        const status = row.status?.toString() || '';
        return s + (status.startsWith('HISTORICAL:') ? (parseInt(status.split(':')[1]) || 1) : 1);
    }, 0) + (Number(l.matches) || 0);

    const totalInnings = m.filter(row => {
        const status = (row.status || '').toLowerCase();
        const balls = Number(row.balls) || 0;
        const isDNB = !status || ['dnb', 'did not bat', 'absent', 'absent hurt'].includes(status);
        if (isDNB && balls === 0) return false;
        return true;
    }).length + (Number(l.innings) || 0);

    const totalNO = m.filter(row => row.is_not_out || row.status === 'Not Out' || row.status === 'not out').length + (Number(l.not_outs) || 0);
    const totalBalls = m.reduce((s, row) => s + (Number(row.balls) || 0), 0) + (Number(l.balls) || 0);
    const totalFours = m.reduce((s, row) => s + (Number(row.fours) || 0), 0) + (Number(l.fours) || 0);
    const totalSixes = m.reduce((s, row) => s + (Number(row.sixes) || 0), 0) + (Number(l.sixes) || 0);
    const total100s = m.reduce((s, row) => s + (Number(row.hundreds) || 0), 0) + (Number(l.hundreds) || 0);
    const total50s = m.reduce((s, row) => s + (Number(row.fifties) || 0), 0) + (Number(l.fifties) || 0);
    const totalDucks = m.reduce((s, row) => s + (Number(row.ducks) || 0), 0) + (Number(l.ducks) || 0);

    const totalBowlRuns = m.reduce((s, row) => s + (Number(row.runs_conceded) || 0), 0) + (Number(l.runs_conceded) || 0);
    const totalBallsBowled = m.reduce((s, row) => s + toBalls(row.overs_bowled), 0) + toBalls(l.overs_bowled);
    const totalBowlOvers = fromBalls(totalBallsBowled);
    const totalMaidens = m.reduce((s, row) => s + (Number(row.maidens) || 0), 0) + (Number(l.maidens) || 0);
    const total4W = m.reduce((s, row) => s + (Number(row.four_wickets) || 0), 0) + (Number(l.four_wickets) || 0);
    const total5W = m.reduce((s, row) => s + (Number(row.five_wickets) || 0), 0) + (Number(l.five_wickets) || 0);
    const totalBowlInnings = m.filter(row => (Number(row.overs_bowled) > 0)).length + (Number(l.bowling_innings) || 0);
    const totalWides = m.reduce((s, row) => s + (Number(row.wides) || 0), 0) + (Number(l.wides) || 0);
    const totalNoBalls = m.reduce((s, row) => s + (Number(row.no_balls) || 0), 0) + (Number(l.no_balls) || 0);

    const allBBI = m.map(row => (Number(row.wickets) > 0 || Number(row.runs_conceded) > 0) ? `${row.wickets}/${row.runs_conceded}` : null).filter(Boolean);
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

    const dismissals = totalInnings - totalNO;
    const batAvg = dismissals > 0 ? (totalRuns / dismissals) : totalRuns;
    const batSR = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
    const bowlAvg = totalWickets > 0 ? totalBowlRuns / totalWickets : 0;
    const bowlEco = totalBallsBowled > 0 ? (totalBowlRuns * 6) / totalBallsBowled : 0;
    const bowlSR = totalWickets > 0 ? totalBallsBowled / totalWickets : 0;
    const maxScore = Math.max(...m.map(row => Number(row.runs) || 0), Number(l.highest_score) || 0);
    const totalHeroCount = m.filter(row => !!row.is_hero).length;

    await db.query(
        `UPDATE players SET 
            runs_scored=$1, wickets_taken=$2, matches_played=$3, batting_stats=$4, bowling_stats=$5, wides=$6, no_balls=$7, updated_at=NOW() 
         WHERE id=$8`,
        [
            totalRuns, totalWickets, totalMatches,
            JSON.stringify({
                matches: totalMatches, innings: totalInnings, runs: totalRuns, balls: totalBalls, fours: totalFours, sixes: totalSixes, 
                notOuts: totalNO, highestScore: String(maxScore), average: parseFloat(batAvg.toFixed(2)), strikeRate: parseFloat(batSR.toFixed(2)),
                hundreds: total100s, fifties: total50s, ducks: totalDucks, heroCount: totalHeroCount
            }),
            JSON.stringify({
                matches: totalMatches, innings: totalBowlInnings, overs: parseFloat(totalBowlOvers.toFixed(1)), runs: totalBowlRuns, 
                wickets: totalWickets, maidens: totalMaidens, average: parseFloat(bowlAvg.toFixed(2)), economy: parseFloat(bowlEco.toFixed(2)), 
                strikeRate: parseFloat(bowlSR.toFixed(2)), bestBowling: bestBBI, fourWickets: total4W, fiveWickets: total5W, wides: totalWides, no_balls: totalNoBalls
            }),
            totalWides, totalNoBalls, playerId
        ]
    );
}

async function run() {
    console.log("Starting bulk career stats recalculation...");
    const { data: players, error } = await db.query("SELECT id, name FROM players WHERE is_club_player = true");
    if (error) {
        console.error("Failed to fetch players:", error);
        return;
    }

    console.log(`Found ${players.length} club players. Starting sync...`);
    for (const p of players) {
        try {
            await recalculateCareerStats(p.id);
        } catch (e) {
            console.error(`Failed to sync player ${p.name} (${p.id}):`, e);
        }
    }
    console.log("Bulk recalculation complete!");
    process.exit(0);
}

run();
