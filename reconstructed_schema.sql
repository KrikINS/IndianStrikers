-- app_users
CREATE TABLE IF NOT EXISTS app_users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'member',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- opponents
CREATE TABLE IF NOT EXISTS opponents (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    rank INTEGER
);

-- players
CREATE TABLE IF NOT EXISTS players (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    batting_style TEXT,
    bowling_style TEXT,
    is_captain BOOLEAN DEFAULT FALSE,
    is_vice_captain BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    matches_played INTEGER DEFAULT 0,
    runs_scored INTEGER DEFAULT 0,
    wickets_taken INTEGER DEFAULT 0,
    average FLOAT8,
    batting_stats JSONB,
    bowling_stats JSONB,
    linked_user_id TEXT,
    jersey_number INTEGER,
    dob DATE,
    external_id TEXT
);

-- matches
CREATE TABLE IF NOT EXISTS matches (
    id BIGSERIAL PRIMARY KEY,
    date DATE,
    opponent_id BIGINT REFERENCES opponents(id),
    result TEXT,
    status TEXT,
    scorecard_data JSONB,
    stats_updated BOOLEAN DEFAULT FALSE,
    squad JSONB,
    is_squad_locked BOOLEAN DEFAULT FALSE
);

-- strategies
CREATE TABLE IF NOT EXISTS strategies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    batter_hand TEXT,
    match_phase TEXT,
    bowler_id TEXT,
    batter_id TEXT,
    positions JSONB
);

-- app_settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- tournament_table
CREATE TABLE IF NOT EXISTS tournament_table (
    id BIGSERIAL PRIMARY KEY,
    team_id TEXT,
    team_name TEXT,
    matches INTEGER,
    won INTEGER,
    lost INTEGER,
    nr INTEGER,
    points INTEGER,
    nrr TEXT
);

-- membership_requests
CREATE TABLE IF NOT EXISTS membership_requests (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    email text not null,
    contact_number text,
    associated_before text check (associated_before in ('Yes', 'No')),
    association_year text,
    status text default 'Pending' check (status in ('Pending', 'Approved', 'Rejected'))
);

-- memories
CREATE TABLE IF NOT EXISTS memories (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    type text check (type in ('image', 'video')) not null,
    url text not null,
    caption text,
    date date,
    likes integer default 0,
    width text,
    comments jsonb default '[]'::jsonb
);

-- Enable RLS for specific tables if they exist in SQL files
alter table membership_requests enable row level security;
drop policy if exists "Enable read access for admins" on membership_requests;
create policy "Enable read access for admins" on membership_requests for select using (true);
drop policy if exists "Enable insert for everyone" on membership_requests;
create policy "Enable insert for everyone" on membership_requests for insert with check (true);
drop policy if exists "Enable update for admins" on membership_requests;
create policy "Enable update for admins" on membership_requests for update using (true);
drop policy if exists "Enable delete for admins" on membership_requests;
create policy "Enable delete for admins" on membership_requests for delete using (true);

alter table memories enable row level security;
drop policy if exists "Enable read access for all" on memories;
create policy "Enable read access for all" on memories for select using (true);
drop policy if exists "Enable insert for admins/members" on memories;
create policy "Enable insert for admins/members" on memories for insert with check (true);
drop policy if exists "Enable delete for admins/members" on memories;
create policy "Enable delete for admins/members" on memories for delete using (true);
