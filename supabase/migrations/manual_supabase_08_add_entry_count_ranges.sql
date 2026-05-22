-- Run this in Supabase SQL editor before deploying the updated
-- analyze-mood-insights edge function.
--
-- This migration updates the CHECK constraint on mood_insight_snapshots.range
-- to allow the new entry-count ranges: '5e', '15e', '30e'.

BEGIN;

-- Drop the old constraint
ALTER TABLE public.mood_insight_snapshots
  DROP CONSTRAINT IF EXISTS mood_insight_snapshots_range_check;

-- Add the new constraint with '5e', '15e', and '30e' included
ALTER TABLE public.mood_insight_snapshots
  ADD CONSTRAINT mood_insight_snapshots_range_check
  CHECK (range IN ('15d', '30d', '90d', '5e', '15e', '30e'));

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';

COMMIT;
