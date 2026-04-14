const { Pool } = require('pg');
const path = require('path');

// Hardcoded connection string for direct migration
const DATABASE_URL = 'postgresql://postgres:AppTerra%23INS@34.93.230.37:5432/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false
});

const sql = `
-- 1. Update 'matches' table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='target_score') THEN
        ALTER TABLE matches ADD COLUMN target_score INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='innings_1_score') THEN
        ALTER TABLE matches ADD COLUMN innings_1_score INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='innings_1_wickets') THEN
        ALTER TABLE matches ADD COLUMN innings_1_wickets INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Update 'player_match_stats' table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_match_stats' AND column_name='is_not_out') THEN
        ALTER TABLE player_match_stats ADD COLUMN is_not_out BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_match_stats' AND column_name='dnb') THEN
        ALTER TABLE player_match_stats ADD COLUMN dnb BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_match_stats' AND column_name='fifty_notified') THEN
        ALTER TABLE player_match_stats ADD COLUMN fifty_notified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_match_stats' AND column_name='hundred_notified') THEN
        ALTER TABLE player_match_stats ADD COLUMN hundred_notified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_match_stats' AND column_name='is_batting_innings') THEN
        ALTER TABLE player_match_stats ADD COLUMN is_batting_innings BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_match_stats' AND column_name='tournament_id') THEN
        ALTER TABLE player_match_stats ADD COLUMN tournament_id UUID;
    END IF;
END $$;

-- 3. Final Career Stats View
CREATE OR REPLACE VIEW player_career_stats_v AS
SELECT 
    pms.player_id,
    COALESCE(t.id, '00000000-0000-0000-0000-000000000000'::uuid) as tournament_id,
    COALESCE(t.name, 'Exhibition Matches') as tournament_name,
    COUNT(DISTINCT pms.match_id) as matches,
    COUNT(CASE WHEN pms.is_batting_innings = TRUE AND pms.dnb = FALSE THEN 1 END) as innings,
    SUM(pms.runs) as runs,
    SUM(pms.balls) as balls,
    SUM(pms.fours) as fours,
    SUM(pms.sixes) as sixes,
    SUM(CASE WHEN pms.is_not_out = TRUE THEN 1 ELSE 0 END) as not_outs,
    COUNT(CASE WHEN pms.runs >= 50 AND pms.runs < 100 THEN 1 END) as fifties,
    COUNT(CASE WHEN pms.runs >= 100 THEN 1 END) as hundreds,
    SUM(pms.wickets) as wickets,
    SUM(pms.runs_conceded) as bowling_runs,
    SUM(pms.overs_bowled) as bowling_overs,
    -- Best Bowling Logic
    MAX(pms.wickets || '/' || pms.runs_conceded) as best_bowling,
    -- Formula: Total Runs / (Innings - NotOuts)
    ROUND(
        SUM(pms.runs)::numeric / 
        NULLIF((COUNT(CASE WHEN pms.is_batting_innings = TRUE AND pms.dnb = FALSE THEN 1 END) - SUM(CASE WHEN pms.is_not_out = TRUE THEN 1 ELSE 0 END)), 0),
    2) as average,
    ROUND((SUM(pms.runs)::numeric / NULLIF(SUM(pms.balls), 0)) * 100, 2) as strike_rate
FROM player_match_stats pms
LEFT JOIN matches m ON pms.match_id = m.id
LEFT JOIN tournaments t ON m.tournament_id = t.id
GROUP BY pms.player_id, t.id, t.name;
`;

async function applyIntegrityPatch() {
    console.log("Applying Final Schema Integrity Patch to Cloud SQL...");
    const client = await pool.connect();
    try {
        await client.query(sql);
        console.log("SUCCESS: Schema and View are now perfectly aligned with Strikers Pulse.");
    } catch (err) {
        console.error("FATAL ERROR applying schema patch:", err);
    } finally {
        client.release();
    }
}

applyIntegrityPatch().then(() => process.exit());
