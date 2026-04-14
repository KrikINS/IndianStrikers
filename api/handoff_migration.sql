-- 1. Matches Table Extension
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS total_runs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_wickets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_balls INTEGER DEFAULT 0;

-- 2. Sync Logic Function
CREATE OR REPLACE FUNCTION sync_match_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE matches
    SET 
        total_runs = (
            SELECT COALESCE(SUM(runs_scored + extras_runs + penalty_runs), 0)
            FROM ball_by_ball
            WHERE match_id = NEW.match_id AND innings_number = NEW.innings_number
        ),
        total_wickets = (
            SELECT COUNT(*)
            FROM ball_by_ball
            WHERE match_id = NEW.match_id AND innings_number = NEW.innings_number AND event_type = 'wicket'
        ),
        total_balls = (
            SELECT COUNT(*)
            FROM ball_by_ball
            WHERE match_id = NEW.match_id AND innings_number = NEW.innings_number AND is_legal_ball = true
        )
    WHERE id = NEW.match_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger Implementation
DROP TRIGGER IF EXISTS after_ball_insert ON ball_by_ball;
CREATE TRIGGER after_ball_insert
AFTER INSERT OR UPDATE OR DELETE ON ball_by_ball
FOR EACH ROW EXECUTE FUNCTION sync_match_totals();

COMMENT ON COLUMN matches.live_state IS 'Stores live field status: {striker_id, non_striker_id, current_bowler_id, current_innings}';
