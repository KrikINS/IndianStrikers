
ALTER TABLE matches ADD COLUMN IF NOT EXISTS squad jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_squad_locked boolean DEFAULT false;
