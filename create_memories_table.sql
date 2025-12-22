-- Drop table to ensure clean state
drop table if exists memories;
-- Create memories table
create table memories (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    type text check (type in ('image', 'video')) not null,
    url text not null,
    caption text,
    date date,
    likes integer default 0,
    width text,
    -- 'col-span-1 row-span-1', etc.
    comments jsonb default '[]'::jsonb -- Storing comments as JSON for simplicity as per plan
);
-- Enable RLS
alter table memories enable row level security;
-- Policies
create policy "Enable read access for all" on memories for
select using (true);
create policy "Enable insert for admins/members" on memories for
insert with check (true);
-- Ideally restrict based on role
create policy "Enable delete for admins/members" on memories for delete using (true);
-- Seed Data (Only if empty)
insert into memories (type, url, caption, date, likes, width, comments)
select 'image',
    'https://images.unsplash.com/photo-1531415074968-055db6435128?q=80&w=1200&auto=format&fit=crop',
    'Championship Winning Moment 2023',
    '2023-11-15',
    124,
    'col-span-2 row-span-2',
    '[{"id": "c1", "text": "What a clear night!", "authorName": "Coach Ravi", "timestamp": "2023-11-16T10:00:00Z", "authorRole": "admin"}, {"id": "c2", "text": "Incredible victory!", "authorName": "Amit", "timestamp": "2023-11-16T10:05:00Z", "authorRole": "member"}]'::jsonb
where not exists (
        select 1
        from memories
    );
insert into memories (type, url, caption, date, likes, width, comments)
select 'image',
    'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?q=80&w=800&auto=format&fit=crop',
    'Training Camp - Day 1',
    '2024-01-10',
    45,
    'col-span-1 row-span-1',
    '[]'::jsonb
where not exists (
        select 1
        from memories
        where caption = 'Training Camp - Day 1'
    );
insert into memories (type, url, caption, date, likes, width, comments)
select 'video',
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1000&auto=format&fit=crop',
    'Match Highlights vs Royal CC',
    '2024-02-20',
    89,
    'col-span-1 row-span-1',
    '[]'::jsonb
where not exists (
        select 1
        from memories
        where caption = 'Match Highlights vs Royal CC'
    );
insert into memories (type, url, caption, date, likes, width, comments)
select 'image',
    'https://images.unsplash.com/photo-1593341646782-e0b495cffd32?q=80&w=800&auto=format&fit=crop',
    'Team Huddle before the big game',
    '2023-12-05',
    67,
    'col-span-1 row-span-2',
    '[]'::jsonb
where not exists (
        select 1
        from memories
        where caption = 'Team Huddle before the big game'
    );
insert into memories (type, url, caption, date, likes, width, comments)
select 'image',
    'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?q=80&w=800&auto=format&fit=crop',
    'Awards Night',
    '2023-11-20',
    150,
    'col-span-1 row-span-1',
    '[]'::jsonb
where not exists (
        select 1
        from memories
        where caption = 'Awards Night'
    );
insert into memories (type, url, caption, date, likes, width, comments)
select 'image',
    'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?q=80&w=800&auto=format&fit=crop',
    'Practice Session Nets',
    '2024-03-01',
    32,
    'col-span-1 row-span-1',
    '[]'::jsonb
where not exists (
        select 1
        from memories
        where caption = 'Practice Session Nets'
    );