-- Ensure previous commands are terminated
;
-- Run these lines to add date of birth and external ID
ALTER TABLE players
ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE players
ADD COLUMN IF NOT EXISTS external_id text;