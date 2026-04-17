-- Run this in Supabase SQL editor to update the existing constraint.
-- This replaces the previous constraint that allowed '7d', '15d', '30d' 
-- with the new required ranges: '15d', '30d', '90d'.

-- 1. First, delete any old snapshots that use the now-invalid '7d' range
-- (Since these are just snapshots, users can always generate new ones)
DELETE FROM public.mood_insight_snapshots WHERE range = '7d';

-- 2. Drop the existing constraint
ALTER TABLE public.mood_insight_snapshots DROP CONSTRAINT IF EXISTS mood_insight_snapshots_range_check;

-- 3. Add the new constraint
ALTER TABLE public.mood_insight_snapshots ADD CONSTRAINT mood_insight_snapshots_range_check CHECK (range IN ('15d', '30d', '90d'));

NOTIFY pgrst, 'reload schema';
