-- Drop dependent tables first
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS opponents CASCADE;
DROP TABLE IF EXISTS strategies CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS tournament_table CASCADE;

-- Recreate opponents with UUID id
CREATE TABLE opponents (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    rank INTEGER,
    strength TEXT,
    weakness TEXT,
    players JSONB DEFAULT '[]'::jsonb,
    color TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate matches with full column list
CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    tournament_name TEXT,
    opponent_name TEXT,
    opponent_team_id TEXT,
    date DATE,
    toss_time TIME,
    venue TEXT,
    is_upcoming BOOLEAN DEFAULT FALSE,
    result TEXT,
    score_for TEXT,
    score_against TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    opponent TEXT,
    tournament TEXT,
    squad JSONB DEFAULT '[]'::jsonb,
    is_squad_locked BOOLEAN DEFAULT FALSE,
    scorecard_data JSONB,
    stats_updated BOOLEAN DEFAULT FALSE
);

-- Recreate strategies
CREATE TABLE strategies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    batter_hand TEXT,
    match_phase TEXT,
    bowler_id TEXT,
    batter_id TEXT,
    positions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate app_settings
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    value_type TEXT DEFAULT 'string',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate tournament_table
CREATE TABLE tournament_table (
    id BIGSERIAL PRIMARY KEY,
    team_id TEXT,
    team_name TEXT,
    matches INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    nr INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    nrr TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
