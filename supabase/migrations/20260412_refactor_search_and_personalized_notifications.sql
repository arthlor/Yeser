CREATE OR REPLACE FUNCTION public.get_gratitude_entries_paginated(
  p_page integer DEFAULT 0,
  p_limit integer DEFAULT 20,
  p_search_term text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  entry_date date,
  statements jsonb,
  moods jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint,
  has_more boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_offset integer;
  v_total bigint;
  v_search_term text := nullif(trim(p_search_term), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_page < 0 THEN
    RAISE EXCEPTION 'Page must be non-negative' USING ERRCODE = '22003';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100' USING ERRCODE = '22003';
  END IF;

  v_offset := p_page * p_limit;

  SELECT COUNT(*)
    INTO v_total
  FROM public.gratitude_entries ge
  WHERE ge.user_id = v_user_id
    AND (
      v_search_term IS NULL
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(ge.statements) AS statement_text(value)
        WHERE statement_text.value ILIKE '%' || v_search_term || '%'
      )
    );

  RETURN QUERY
  SELECT
    ge.id,
    ge.user_id,
    ge.entry_date,
    ge.statements,
    ge.moods,
    ge.created_at,
    ge.updated_at,
    v_total AS total_count,
    (v_offset + p_limit < v_total) AS has_more
  FROM public.gratitude_entries ge
  WHERE ge.user_id = v_user_id
    AND (
      v_search_term IS NULL
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(ge.statements) AS statement_text(value)
        WHERE statement_text.value ILIKE '%' || v_search_term || '%'
      )
    )
  ORDER BY ge.entry_date DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_gratitude_entries_paginated(integer, integer, text) TO authenticated;

COMMENT ON FUNCTION public.get_gratitude_entries_paginated(integer, integer, text) IS
  'Returns paginated gratitude entries for the authenticated user with optional statement-text search.';

CREATE OR REPLACE FUNCTION public.get_gratitude_entries_paginated(
  p_page integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  entry_date date,
  statements jsonb,
  moods jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint,
  has_more boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_gratitude_entries_paginated(p_page, p_limit, NULL);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_gratitude_entries_paginated(integer, integer) TO authenticated;

COMMENT ON FUNCTION public.get_gratitude_entries_paginated(integer, integer) IS
  'Backward-compatible wrapper for paginated gratitude entries without statement-text search.';

CREATE OR REPLACE FUNCTION public.enqueue_notification_jobs(p_horizon_minutes integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_time timestamptz := NOW() + make_interval(mins => p_horizon_minutes);
  inserted integer;
BEGIN
  INSERT INTO public.notification_jobs (
    user_id,
    scheduled_for,
    tokens,
    language,
    metadata
  )
  SELECT
    p.id,
    date_trunc('minute', v_target_time),
    array_agg(pt.token ORDER BY pt.created_at DESC),
    COALESCE(p.language, 'en'),
    jsonb_build_object(
      'variant',
      CASE
        WHEN EXTRACT(HOUR FROM (v_target_time AT TIME ZONE p.timezone)) < 17 THEN 'midday'
        ELSE 'evening'
      END,
      'timezone',
      p.timezone,
      'notification_time',
      to_char(p.notification_time, 'HH24:MI'),
      'memory_statement',
      memory_pick.statement,
      'memory_entry_date',
      CASE
        WHEN memory_pick.entry_date IS NULL THEN NULL
        ELSE to_char(memory_pick.entry_date, 'YYYY-MM-DD')
      END,
      'memory_age_days',
      memory_pick.age_days
    )
  FROM public.profiles p
  JOIN public.push_tokens pt ON p.id = pt.user_id
  LEFT JOIN LATERAL (
    SELECT
      ge.entry_date,
      statement_pick.statement,
      ((v_target_time AT TIME ZONE p.timezone)::date - ge.entry_date) AS age_days
    FROM public.gratitude_entries ge
    JOIN LATERAL (
      SELECT statement_value.value AS statement
      FROM jsonb_array_elements_text(ge.statements) AS statement_value(value)
      ORDER BY random()
      LIMIT 1
    ) AS statement_pick ON true
    WHERE ge.user_id = p.id
      AND jsonb_array_length(ge.statements) > 0
      AND ge.entry_date <= ((v_target_time AT TIME ZONE p.timezone)::date - 14)
    ORDER BY random()
    LIMIT 1
  ) AS memory_pick ON true
  WHERE p.notification_time IS NOT NULL
    AND p.timezone IS NOT NULL
    AND p.onboarded = true
    AND p.notification_time = (date_trunc('minute', v_target_time AT TIME ZONE p.timezone))::time
    AND NOT EXISTS (
      SELECT 1
      FROM public.notification_jobs nj
      WHERE nj.user_id = p.id
        AND nj.scheduled_for = date_trunc('minute', v_target_time)
        AND nj.status IN ('pending', 'processing')
    )
  GROUP BY
    p.id,
    p.language,
    p.timezone,
    p.notification_time,
    memory_pick.entry_date,
    memory_pick.statement,
    memory_pick.age_days;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$function$;

NOTIFY pgrst, 'reload schema';
