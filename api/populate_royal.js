const db = require('./db');

async function populate() {
    const matchId = '2d4ec107-85e8-4c7b-b081-0edc96365336';
    
    // 1. Get player IDs by name
    const { data: players } = await db.query('SELECT id, name FROM players');
    if (!players) throw new Error("Could not fetch players for mapping");
    
    const findId = (name) => {
        const p = players.find(x => x.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (!p) {
            console.warn(`[Populate] Player not found: ${name}`);
            return '00000000-0000-0000-0000-000000000000';
        }
        return p.id;
    };

    const is_batting = [
        { name: "Anas Ummer", r: 46, b: 19, f: 7, s: 1, out: "Caught", fid: "Bilal Khan", bid: "Bilal Khan" },
        { name: "Hussain Khan", r: 131, b: 65, f: 13, s: 10, out: "Caught", fid: "Navid Ullah", bid: "Hazrat Shah Khan" },
        { name: "Shehin Shihabudeen", r: 16, b: 9, f: 1, s: 1, out: "Caught", fid: "Shahi Said", bid: "Tariq Ullah" },
        { name: "Nastar PuthenPurayil", r: 15, b: 8, f: 3, s: 0, out: "Caught", fid: "Said Amin Mir", bid: "Said Amin Mir" },
        { name: "Prasanth Padmanabhan", r: 8, b: 4, f: 2, s: 0, out: "Bowled", bid: "Hazrat Shah Khan" },
        { name: "Adil Nawaz", r: 13, b: 8, f: 1, s: 1, out: "Bowled", bid: "Sana Ulah Khan" },
        { name: "Shaik Faizullah", r: 12, b: 8, f: 1, s: 0, out: "Not Out" },
        { name: "Fasil Ali", r: 0, b: 1, f: 0, s: 0, out: "Bowled", bid: "Sana Ulah Khan" },
        { name: "Sebin Baby", r: 0, b: 1, f: 0, s: 0, out: "Bowled", bid: "Sana Ulah Khan" }
    ];

    const royal_bowling = [
        { name: "Said Amin Mir", o: 4, m: 0, r: 45, w: 1, wd: 2, nb: 0 },
        { name: "Shafiq Muhammed", o: 3, m: 0, r: 49, w: 0, wd: 1, nb: 1 },
        { name: "Bilal Khan", o: 4, m: 0, r: 50, w: 1, wd: 1, nb: 0 },
        { name: "Sana Ulah Khan", o: 3, m: 0, r: 49, w: 3, wd: 1, nb: 0 },
        { name: "Abdul Aziz", o: 1, m: 0, r: 14, w: 0, wd: 0, nb: 0 },
        { name: "Hazrat Shah Khan", o: 4, m: 0, r: 31, w: 3, wd: 1, nb: 1 },
        { name: "Navid Ullah", o: 1, m: 0, r: 14, w: 0, wd: 0, nb: 1 }
    ];

    const royal_batting = [
        { name: "Kamran Khan", r: 14, b: 6, f: 3, s: 0, out: "Bowled", bid: "Hussain Khan" },
        { name: "Abdul Aziz", r: 6, b: 5, f: 1, s: 0, out: "Bowled", bid: "Adil Nawaz" },
        { name: "Sana Ulah Khan", r: 18, b: 13, f: 3, s: 0, out: "Bowled", bid: "Anees Ahad" },
        { name: "Tariq Ullah", r: 1, b: 2, f: 0, s: 0, out: "Caught", fid: "Shehin Shihabudeen", bid: "Shaik Faizullah" },
        { name: "Hazrat Shah Khan", r: 27, b: 15, f: 2, s: 2, out: "Caught", fid: "Adil Nawaz", bid: "Anees Ahad" },
        { name: "Navid Ullah", r: 33, b: 20, f: 3, s: 1, out: "Not Out" },
        { name: "Gul Hayat Khan", r: 16, b: 13, f: 2, s: 0, out: "LBW", bid: "Anees Ahad" },
        { name: "Shafiq Muhammed", r: 2, b: 4, f: 0, s: 0, out: "Caught", fid: "Sebin Baby", bid: "Nastar PuthenPurayil" },
        { name: "Said Amin Mir", r: 0, b: 1, f: 0, s: 0, out: "Bowled", bid: "Nastar PuthenPurayil" },
        { name: "Shahi Said", r: 0, b: 2, f: 0, s: 0, out: "LBW", bid: "Nastar PuthenPurayil" }
    ];

    const is_bowling = [
        { name: "Hussain Khan", o: 4, m: 0, r: 40, w: 1, wd: 4, nb: 1 },
        { name: "Rabi Rasheed", o: 1, m: 0, r: 35, w: 0, wd: 2, nb: 2 },
        { name: "Adil Nawaz", o: 2, m: 0, r: 32, w: 1, wd: 3, nb: 1 },
        { name: "Anees Ahad", o: 4, m: 0, r: 29, w: 4, wd: 0, nb: 0 },
        { name: "Shaik Faizullah", o: 3, m: 0, r: 40, w: 1, wd: 3, nb: 1 },
        { name: "Prasanth Padmanabhan", o: 1, m: 0, r: 19, w: 0, wd: 0, nb: 0 },
        { name: "Nastar PuthenPurayil", o: 1, m: 0, r: 2, w: 3, wd: 0, nb: 0 }
    ];

    const scorecard = {
        innings1: {
            batting: is_batting.map(b => ({ playerId: findId(b.name), name: b.name, runs: b.r, balls: b.b, fours: b.f, sixes: b.s, outHow: b.out, fielderId: b.fid?findId(b.fid):'', bowlerId: b.bid?findId(b.bid):'' })),
            bowling: royal_bowling.map(b => ({ playerId: findId(b.name), name: b.name, overs: b.o, maidens: b.m, runsConceded: b.r, wickets: b.w, wides: b.wd, no_balls: b.nb })),
            extras: { wide: 6, no_ball: 3, legByes: 0, byes: 0 },
            totalRuns: 241, totalWickets: 9, totalOvers: 20
        },
        innings2: {
            batting: royal_batting.map(b => ({ playerId: findId(b.name), name: b.name, runs: b.r, balls: b.b, fours: b.f, sixes: b.s, outHow: b.out, fielderId: b.fid?findId(b.fid):'', bowlerId: b.bid?findId(b.bid):'' })),
            bowling: is_bowling.map(b => ({ playerId: findId(b.name), name: b.name, overs: b.o, maidens: b.m, runsConceded: b.r, wickets: b.w, wides: b.wd, no_balls: b.nb })),
            extras: { wide: 12, no_ball: 5, legByes: 0, byes: 0 },
            totalRuns: 134, totalWickets: 10, totalOvers: 16
        }
    };

    const finalData = {
        scorecard,
        final_score_home: JSON.stringify({ runs: 241, wickets: 9, overs: 20 }),
        final_score_away: JSON.stringify({ runs: 134, wickets: 10, overs: 16 }),
        result_summary: "Indian Strikers won by 107 runs",
        status: "completed",
        is_career_synced: false // User to sync manually or via UI
    };

    console.log("[Populate] Updating match table...");
    await db.query(
        `UPDATE matches SET status=$1, scorecard=$2, final_score_home=$3, final_score_away=$4, result_summary=$5 WHERE id=$6`,
        [finalData.status, JSON.stringify(finalData.scorecard), finalData.final_score_home, finalData.final_score_away, finalData.result_summary, matchId]
    );

    console.log("[Populate] Success!");
    process.exit(0);
}

populate().catch(e => { console.error(e); process.exit(1); });
