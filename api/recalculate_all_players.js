require('dotenv').config();
const db = require('./db');

async function recalculateCareerStats(playerId) {
    const { data: participationStats } = await db.query(
        `SELECT pms.*, pms.status as pms_status, m.status as match_status, m.is_test, m.scorecard, m.live_data
         FROM matches m
         LEFT JOIN player_match_stats pms ON (m.id = pms.match_id AND pms.player_id = $1::BIGINT)
         WHERE (pms.player_id IS NOT NULL OR m.team1_xi @> jsonb_build_array($1::text) OR m.team1_xi @> jsonb_build_array($1::bigint) OR m.team2_xi @> jsonb_build_array($1::text) OR m.team2_xi @> jsonb_build_array($1::bigint))
         AND (m.is_test IS NOT TRUE) AND (m.status != 'upcoming' AND m.status != 'Upcoming')`,
        [playerId]
    );

    const { data: legacyBaseline } = await db.getOne('SELECT * FROM player_legacy_stats WHERE player_id = $1', [playerId]);
    const l = legacyBaseline || { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, matches: 0, innings: 0, not_outs: 0, highest_score: 0, bowling_innings: 0, overs_bowled: 0, runs_conceded: 0, maidens: 0, hundreds: 0, fifties: 0, ducks: 0, four_wickets: 0, five_wickets: 0, wides: 0, no_balls: 0, best_bowling: '0/0' };
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

    const stats = m.map(row => {
        let runs = Number(row.runs) || 0;
        let balls = Number(row.balls) || 0;
        let fours = Number(row.fours) || 0;
        let sixes = Number(row.sixes) || 0;
        let pStatus = (row.pms_status || '').toLowerCase().trim();
        let wickets = Number(row.wickets) || 0;
        let runsConceded = Number(row.runs_conceded) || 0;
        let oversBowled = Number(row.overs_bowled) || 0;
        let maidens = Number(row.maidens) || 0;
        let wides = Number(row.wides) || 0;
        let noBalls = Number(row.no_balls) || 0;

        if (row.scorecard) {
            try {
                const sc = typeof row.scorecard === 'string' ? JSON.parse(row.scorecard) : row.scorecard;
                const bat = [...(sc.innings1?.batting || []), ...(sc.innings2?.batting || [])].find(b => String(b.playerId) === String(playerId));
                const bowl = [...(sc.innings1?.bowling || []), ...(sc.innings2?.bowling || [])].find(b => String(b.playerId) === String(playerId));
                if (bat) {
                    runs = Number(bat.runs) || 0;
                    balls = Number(bat.balls) || 0;
                    fours = Number(bat.fours) || 0;
                    sixes = Number(bat.sixes) || 0;
                    pStatus = (bat.outHow || (bat.isNotOut ? 'not out' : 'out')).toLowerCase().trim();
                }
                if (bowl) {
                    wickets = Number(bowl.wickets) || 0;
                    runsConceded = Number(bowl.runs || bowl.bowlingRuns || bowl.runsConceded) || 0;
                    oversBowled = Number(bowl.overs || bowl.bowlingOvers) || 0;
                    maidens = Number(bowl.maidens) || 0;
                    wides = Number(bowl.wides) || 0;
                    noBalls = Number(bowl.no_balls || bowl.noBalls) || 0;
                }
            } catch(e) {}
        }
        const isNotOut = pStatus === 'not out' || pStatus === 'retired hurt';
        const isOut = pStatus !== '' && !['dnb', 'did not bat', 'absent', 'absent hurt', 'not out', 'retired hurt', 'batting'].includes(pStatus);
        const batted = (isNotOut || isOut) && balls > 0;
        return { runs, balls, fours, sixes, pStatus, isNotOut, isOut, batted, wickets, runsConceded, oversBowled, maidens, wides, noBalls, hundred: runs >= 100 ? 1 : 0, fifty: (runs >= 50 && runs < 100) ? 1 : 0, duck: (runs === 0 && isOut) ? 1 : 0, fourW: wickets === 4 ? 1 : 0, fiveW: wickets >= 5 ? 1 : 0 };
    });

    const totalMatches = m.reduce((s, row) => {
        const status = row.status?.toString() || '';
        return s + (status.startsWith('HISTORICAL:') ? (parseInt(status.split(':')[1]) || 1) : 1);
    }, 0) + (Number(l.matches) || 0);

    const totalRuns = stats.reduce((s, r) => s + r.runs, 0) + (Number(l.runs) || 0);
    const totalWickets = stats.reduce((s, r) => s + r.wickets, 0) + (Number(l.wickets) || 0);
    const totalBalls = stats.reduce((s, r) => s + r.balls, 0) + (Number(l.balls) || 0);
    const totalFours = stats.reduce((s, r) => s + r.fours, 0) + (Number(l.fours) || 0);
    const totalSixes = stats.reduce((s, r) => s + r.sixes, 0) + (Number(l.sixes) || 0);
    const total100s = stats.reduce((s, r) => s + r.hundred, 0) + (Number(l.hundreds) || 0);
    const total50s = stats.reduce((s, r) => s + r.fifty, 0) + (Number(l.fifties) || 0);
    const totalDucks = stats.reduce((s, r) => s + r.duck, 0) + (Number(l.ducks) || 0);
    const totalInnings = stats.filter(r => r.batted).length + (Number(l.innings) || 0);
    const totalNO = stats.filter(r => r.batted && r.isNotOut).length + (Number(l.not_outs) || 0);
    const totalBowlRuns = stats.reduce((s, r) => s + r.runsConceded, 0) + (Number(l.runs_conceded) || 0);
    const totalBallsBowled = stats.reduce((s, r) => s + toBalls(r.oversBowled), 0) + (toBalls(l.overs_bowled) || 0);
    const totalBowlOvers = fromBalls(totalBallsBowled);
    const totalBowlInnings = stats.filter(r => r.oversBowled > 0).length + (Number(l.bowling_innings) || 0);
    const maxScore = Math.max(...stats.map(r => r.runs), Number(l.highest_score) || 0);

    const { data: oldData } = await db.getOne('SELECT runs_scored FROM players WHERE id = $1', [playerId]);
    const oldRuns = Number(oldData?.runs_scored) || 0;

    await db.query(`UPDATE players SET runs_scored=$1, wickets_taken=$2, matches_played=$3, batting_stats=$4, bowling_stats=$5, updated_at=NOW() WHERE id=$6`, [
        totalRuns, totalWickets, totalMatches,
        JSON.stringify({ matches: totalMatches, innings: totalInnings, runs: totalRuns, balls: totalBalls, fours: totalFours, sixes: totalSixes, notOuts: totalNO, highestScore: String(maxScore), average: parseFloat(((totalInnings-totalNO) > 0 ? totalRuns/(totalInnings-totalNO) : totalRuns).toFixed(2)), strikeRate: parseFloat((totalBalls > 0 ? (totalRuns/totalBalls)*100 : 0).toFixed(2)), hundreds: total100s, fifties: total50s, ducks: totalDucks }),
        JSON.stringify({ matches: totalMatches, innings: totalBowlInnings, overs: parseFloat(totalBowlOvers.toFixed(1)), runs: totalBowlRuns, wickets: totalWickets, average: parseFloat((totalWickets > 0 ? totalBowlRuns/totalWickets : 0).toFixed(2)), economy: parseFloat((totalBallsBowled > 0 ? (totalBowlRuns*6)/totalBallsBowled : 0).toFixed(2)), strikeRate: parseFloat((totalWickets > 0 ? totalBallsBowled/totalWickets : 0).toFixed(2)) }),
        playerId
    ]);

    if (totalRuns !== oldRuns) {
        return { playerId, oldRuns, newRuns: totalRuns, diff: totalRuns - oldRuns };
    }
    return null;
}

async function runAll() {
    console.log("Starting bulk recalculation for all players...");
    const { data: players } = await db.query('SELECT id, name FROM players ORDER BY id');
    let updatedCount = 0;
    const changes = [];

    for (const p of players) {
        process.stdout.write(`Recalculating ${p.name} (${p.id})... `);
        const change = await recalculateCareerStats(p.id);
        if (change) {
            console.log(`UPDATED (+${change.diff} runs)`);
            changes.push({ name: p.name, ...change });
            updatedCount++;
        } else {
            console.log("OK");
        }
    }

    console.log("\n--- RECALCULATION COMPLETE ---");
    console.log(`Total Players: ${players.length}`);
    console.log(`Players with changed stats: ${updatedCount}`);
    
    if (changes.length > 0) {
        console.log("\nTop Changes:");
        changes.sort((a,b) => b.diff - a.diff).slice(0, 10).forEach(c => {
            console.log(`${c.name}: ${c.oldRuns} -> ${c.newRuns} (+${c.diff})`);
        });
    }
}

runAll().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
