-- Run this in Supabase SQL editor before deploying the updated
-- analyze-mood-insights edge function.
--
-- This migration creates a persisted snapshot table for Insights and exposes
-- a redacted RPC so free users only receive the highlighted preview while Pro
-- users receive the full narrative.

CREATE TABLE IF NOT EXISTS public.mood_insight_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  range text NOT NULL CHECK (range IN ('15d', '30d', '90d')),
  language text NOT NULL CHECK (language IN ('en', 'tr', 'es')),
  highlighted_insight jsonb NOT NULL,
  narrative jsonb NOT NULL,
  entry_count_at_generation integer NOT NULL DEFAULT 0 CHECK (entry_count_at_generation >= 0),
  generated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, range, language)
);

CREATE INDEX IF NOT EXISTS idx_mood_insight_snapshots_user_range_language
  ON public.mood_insight_snapshots(user_id, range, language);

CREATE INDEX IF NOT EXISTS idx_mood_insight_snapshots_generated_at
  ON public.mood_insight_snapshots(generated_at DESC);

ALTER TABLE public.mood_insight_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mood_insight_snapshots FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_latest_mood_insight_snapshot(
  p_range text DEFAULT '30d',
  p_language text DEFAULT 'en'
)
RETURNS TABLE (
  range text,
  language text,
  highlighted_insight jsonb,
  narrative jsonb,
  generated_at timestamptz,
  entry_count_at_generation integer,
  is_preview_only boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_pro boolean := false;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(is_pro, false)
    INTO v_is_pro
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN QUERY
  SELECT
    mis.range,
    mis.language,
    mis.highlighted_insight,
    CASE WHEN v_is_pro THEN mis.narrative ELSE NULL END AS narrative,
    mis.generated_at,
    mis.entry_count_at_generation,
    NOT v_is_pro AS is_preview_only
  FROM public.mood_insight_snapshots AS mis
  WHERE mis.user_id = v_user_id
    AND mis.range = COALESCE(p_range, '30d')
    AND mis.language = COALESCE(p_language, 'en')
  ORDER BY mis.generated_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_mood_insight_snapshot(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
