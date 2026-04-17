require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./db');

async function runMigration() {
    console.log('[Migration] Starting Schema Alignment...');

    const commands = [
        // 1. ADD COMMENTARY TO BALL_BY_BALL
        `ALTER TABLE ball_by_ball ADD COLUMN IF NOT EXISTS commentary TEXT;`,
        
        // 2. ADD WAGON_WHEEL_ZONE TO BALL_BY_BALL (Alias for legacy shot_zone or new field)
        `ALTER TABLE ball_by_ball ADD COLUMN IF NOT EXISTS wagon_wheel_zone VARCHAR(50);`,
        
        // 3. ADD WIDES TO PLAYERS
        `ALTER TABLE players ADD COLUMN IF NOT EXISTS wides INTEGER DEFAULT 0;`,
        
        // 4. ADD NO_BALLS TO PLAYERS
        `ALTER TABLE players ADD COLUMN IF NOT EXISTS no_balls INTEGER DEFAULT 0;`,

        // 5. Ensure shot_zone data is moved to wagon_wheel_zone if it exists
        `UPDATE ball_by_ball SET wagon_wheel_zone = shot_zone WHERE wagon_wheel_zone IS NULL AND shot_zone IS NOT NULL;`,

        // 6. CREATE COMMENTARY_TEMPLATES TABLE
        `CREATE TABLE IF NOT EXISTS commentary_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type VARCHAR(50) NOT NULL,
            text TEXT NOT NULL,
            wagon_wheel_zone VARCHAR(50),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
    ];

    for (const cmd of commands) {
        console.log(`[Migration] Executing: ${cmd}`);
        const { error } = await db.query(cmd);
        if (error) {
            console.error(`[Migration] FAILED: ${cmd}`, error.message);
            // Don't stop on single failure as columns might already exist
        } else {
            console.log(`[Migration] SUCCESS`);
        }
    }

    console.log('[Migration] Completed.');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('[Migration] CRITICAL FAILURE:', err);
    process.exit(1);
});
