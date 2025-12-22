create table if not exists membership_requests (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    email text not null,
    contact_number text,
    associated_before text check (associated_before in ('Yes', 'No')),
    association_year text,
    status text default 'Pending' check (status in ('Pending', 'Approved', 'Rejected'))
);
-- Enable RLS
alter table membership_requests enable row level security;
-- Policies
create policy "Enable read access for admins" on membership_requests for
select using (true);
-- Ideally restrict to admin role if using Supabase Auth, but usually handled by app logic
create policy "Enable insert for everyone" on membership_requests for
insert with check (true);
create policy "Enable update for admins" on membership_requests for
update using (true);
create policy "Enable delete for admins" on membership_requests for delete using (true);