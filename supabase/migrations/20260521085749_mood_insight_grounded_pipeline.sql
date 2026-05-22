-- Adds grounded mood insight metadata, cached source fingerprints, and an
-- atomic quota-consumption RPC for the analyze-mood-insights Edge Function.

BEGIN;

ALTER TABLE public.mood_insight_snapshots
  ADD COLUMN IF NOT EXISTS analysis_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS source_hash text,
  ADD COLUMN IF NOT EXISTS statement_count_at_generation integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS range_entry_count_at_generation integer NOT NULL DEFAULT 0;

ALTER TABLE public.mood_insight_snapshots
  DROP CONSTRAINT IF EXISTS mood_insight_snapshots_risk_level_check;

ALTER TABLE public.mood_insight_snapshots
  ADD CONSTRAINT mood_insight_snapshots_risk_level_check
  CHECK (risk_level IN ('none', 'mild_distress', 'high_distress', 'crisis'));

ALTER TABLE public.mood_insight_snapshots
  DROP CONSTRAINT IF EXISTS mood_insight_snapshots_statement_count_check;

ALTER TABLE public.mood_insight_snapshots
  ADD CONSTRAINT mood_insight_snapshots_statement_count_check
  CHECK (statement_count_at_generation >= 0);

ALTER TABLE public.mood_insight_snapshots
  DROP CONSTRAINT IF EXISTS mood_insight_snapshots_range_entry_count_check;

ALTER TABLE public.mood_insight_snapshots
  ADD CONSTRAINT mood_insight_snapshots_range_entry_count_check
  CHECK (range_entry_count_at_generation >= 0);

CREATE INDEX IF NOT EXISTS idx_mood_insight_snapshots_source_hash
  ON public.mood_insight_snapshots(user_id, range, language, source_hash);

DROP FUNCTION IF EXISTS public.get_latest_mood_insight_snapshot(text, text);

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
  is_preview_only boolean,
  analysis_details jsonb,
  risk_level text,
  source_hash text,
  statement_count_at_generation integer,
  range_entry_count_at_generation integer
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
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
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
    NOT v_is_pro AS is_preview_only,
    CASE WHEN v_is_pro THEN mis.analysis_details ELSE NULL END AS analysis_details,
    mis.risk_level,
    mis.source_hash,
    mis.statement_count_at_generation,
    mis.range_entry_count_at_generation
  FROM public.mood_insight_snapshots AS mis
  WHERE mis.user_id = v_user_id
    AND mis.range = COALESCE(p_range, '30d')
    AND mis.language = COALESCE(p_language, 'en')
  ORDER BY mis.generated_at DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_latest_mood_insight_snapshot(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_mood_insight_snapshot(text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_usage(
  p_user_id uuid,
  p_feature text,
  p_daily_limit integer
)
RETURNS TABLE (
  allowed boolean,
  used integer,
  remaining integer,
  reset_in_seconds integer,
  usage_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start timestamptz :=
    (date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc');
  v_tomorrow_start timestamptz := v_today_start + interval '1 day';
  v_current_count integer;
  v_usage_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required' USING errcode = '22004';
  END IF;

  IF p_daily_limit IS NULL OR p_daily_limit < 1 THEN
    RAISE EXCEPTION 'Daily limit must be positive' USING errcode = '22023';
  END IF;

  IF p_feature IS NULL OR length(trim(p_feature)) = 0 THEN
    RAISE EXCEPTION 'Feature is required' USING errcode = '22004';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_user_id::text || ':' || p_feature || ':' || v_today_start::date::text,
      0
    )
  );

  SELECT count(*)::integer
    INTO v_current_count
  FROM public.ai_usage
  WHERE user_id = p_user_id
    AND created_at >= v_today_start
    AND created_at < v_tomorrow_start;

  IF v_current_count >= p_daily_limit THEN
    RETURN QUERY SELECT
      false,
      v_current_count,
      0,
      greatest(extract(epoch from (v_tomorrow_start - now()))::integer, 0),
      NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.ai_usage(user_id, feature)
  VALUES (p_user_id, p_feature)
  RETURNING id INTO v_usage_id;

  RETURN QUERY SELECT
    true,
    v_current_count + 1,
    greatest(p_daily_limit - v_current_count - 1, 0),
    greatest(extract(epoch from (v_tomorrow_start - now()))::integer, 0),
    v_usage_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_usage(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage(uuid, text, integer)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
