const { Pool } = require('pg');
const path = require('path');

// Hardcoded connection string for direct migration
const DATABASE_URL = 'postgresql://postgres:AppTerra%23INS@34.93.230.37:5432/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false
});

const sql = `
-- 1. Ensure columns exist on player_match_stats
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_match_stats' AND column_name='is_batting_innings') THEN
        ALTER TABLE player_match_stats ADD COLUMN is_batting_innings BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_match_stats' AND column_name='tournament_id') THEN
        ALTER TABLE player_match_stats ADD COLUMN tournament_id UUID;
    END IF;
END $$;

-- 2. Create the View
CREATE OR REPLACE VIEW player_career_stats_v AS
SELECT 
    pms.player_id,
    COALESCE(t.id, '00000000-0000-0000-0000-000000000000'::uuid) as tournament_id,
    COALESCE(t.name, 'Exhibition Matches') as tournament_name,
    COUNT(DISTINCT pms.match_id) as matches,
    COUNT(CASE WHEN pms.is_batting_innings THEN 1 END) as innings,
    SUM(pms.runs) as runs,
    SUM(pms.balls) as balls,
    SUM(pms.fours) as fours,
    SUM(pms.sixes) as sixes,
    SUM(CASE WHEN pms.is_not_out THEN 1 ELSE 0 END) as not_outs,
    COUNT(CASE WHEN pms.runs >= 50 AND pms.runs < 100 THEN 1 END) as fifties,
    COUNT(CASE WHEN pms.runs >= 100 THEN 1 END) as hundreds,
    SUM(pms.wickets) as wickets,
    SUM(pms.bowling_runs) as bowling_runs,
    SUM(pms.bowling_overs) as bowling_overs,
    MAX(pms.wickets || '/' || pms.bowling_runs) as best_bowling,
    ROUND(
        SUM(pms.runs)::numeric / 
        NULLIF((COUNT(CASE WHEN pms.is_batting_innings THEN 1 END) - SUM(CASE WHEN pms.is_not_out THEN 1 ELSE 0 END)), 0),
    2) as average,
    ROUND((SUM(pms.runs)::numeric / NULLIF(SUM(pms.balls), 0)) * 100, 2) as strike_rate
FROM player_match_stats pms
LEFT JOIN matches m ON pms.match_id = m.id
LEFT JOIN tournaments t ON m.tournament_id = t.id
GROUP BY pms.player_id, t.id, t.name;
`;

async function applySchema() {
    console.log("Applying SQL Schema updates to Cloud SQL...");
    let client;
    try {
        client = await pool.connect();
        console.log("Connection established...");
        await client.query(sql);
        console.log("Successfully applied schema updates.");
    } catch (err) {
        console.error("Error applying schema:", err);
        if (err.code === '28000') {
          console.error("Authentication failed: Check if user 'postgres' has the correct permissions or if SSL is required.");
        }
    } finally {
        if (client) client.release();
    }
}

applySchema().then(() => process.exit());
