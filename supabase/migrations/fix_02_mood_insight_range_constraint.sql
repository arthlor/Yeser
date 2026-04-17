-- fix_02_mood_insight_range_constraint.sql
--
-- Aligns the mood_insight_snapshots.range check constraint with the client
-- (MoodAnalyticsRange = '15d' | '30d' | '90d') and with the
-- analyze-mood-insights Edge Function, which upserts rows with '90d'.
--
-- Safe to run multiple times.

begin;

-- Drop any legacy rows that can't pass the new constraint.
delete from public.mood_insight_snapshots
where range not in ('15d', '30d', '90d');

alter table public.mood_insight_snapshots
  drop constraint if exists mood_insight_snapshots_range_check;

alter table public.mood_insight_snapshots
  add constraint mood_insight_snapshots_range_check
  check (range in ('15d', '30d', '90d'));

notify pgrst, 'reload schema';

commit;
