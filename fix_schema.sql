-- Run this in your Supabase SQL Editor to fix the API Error (400)
-- This adds the missing column to the 'players' table.
ALTER TABLE players
ADD COLUMN IF NOT EXISTS linked_user_id text;