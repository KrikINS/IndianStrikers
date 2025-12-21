-- Ensure previous commands are terminated
;
-- Run this line alone to add the column
ALTER TABLE players
ADD COLUMN IF NOT EXISTS jersey_number integer;