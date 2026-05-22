-- Phase review hardening follow-up.
-- Covers security-definer search_path, AI/database performance gaps,
-- storage cleanup durability, and mobile version-gating primitives.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.check_is_pro_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF (OLD.is_pro IS DISTINCT FROM NEW.is_pro) THEN
    IF (auth.role() != 'service_role') THEN
      RAISE EXCEPTION 'You are not authorized to directly update the is_pro subscription status. Please use the official subscription flow.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_gratitude_entries_user_id
  ON public.gratitude_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_gratitude_entries_user_date
  ON public.gratitude_entries(user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
  ON public.push_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_user_id
  ON public.notification_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_job_id
  ON public.notification_logs(job_id);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_pending_scheduled
  ON public.notification_jobs(scheduled_for ASC)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.get_recent_statement_count(p_start_date date)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT coalesce(
    sum(
      CASE
        WHEN jsonb_typeof(statements) = 'array' THEN jsonb_array_length(statements)
        ELSE 0
      END
    ),
    0
  )::integer
  FROM public.gratitude_entries
  WHERE user_id = auth.uid()
    AND entry_date >= p_start_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_statement_count(date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_recent_statement_count(date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_recent_statement_count(date) TO authenticated;

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_readable" ON public.app_config;
CREATE POLICY "app_config_readable"
  ON public.app_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.app_config FROM anon, authenticated;
GRANT SELECT ON public.app_config TO anon, authenticated;

INSERT INTO public.app_config (key, value)
VALUES (
  'minimum_supported_version',
  jsonb_build_object('ios', '1.3.0', 'android', '1.3.0')
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.deleted_users_tombstone (
  user_id_hash text PRIMARY KEY,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deleted_users_tombstone ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deleted_users_tombstone FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL DEFAULT 'gratitude-media',
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup_queue FROM anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_cleanup_queue_pending_unique
  ON public.storage_cleanup_queue(bucket_id, storage_path)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_queue_pending
  ON public.storage_cleanup_queue(created_at ASC)
  WHERE status = 'pending';

DROP POLICY IF EXISTS "mood_insight_snapshots_no_direct_client_access" ON public.mood_insight_snapshots;
CREATE POLICY "mood_insight_snapshots_no_direct_client_access"
  ON public.mood_insight_snapshots
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "notification_jobs_no_direct_client_access" ON public.notification_jobs;
CREATE POLICY "notification_jobs_no_direct_client_access"
  ON public.notification_jobs
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "notification_logs_no_direct_client_access" ON public.notification_logs;
CREATE POLICY "notification_logs_no_direct_client_access"
  ON public.notification_logs
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deleted_users_tombstone_no_direct_client_access" ON public.deleted_users_tombstone;
CREATE POLICY "deleted_users_tombstone_no_direct_client_access"
  ON public.deleted_users_tombstone
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "storage_cleanup_queue_no_direct_client_access" ON public.storage_cleanup_queue;
CREATE POLICY "storage_cleanup_queue_no_direct_client_access"
  ON public.storage_cleanup_queue
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DO $$
BEGIN
  IF to_regclass('public.idx_push_tokens_user_lookup') IS NOT NULL THEN
    DROP INDEX IF EXISTS public.idx_push_tokens_user_id;
  END IF;

  IF to_regclass('public.notification_jobs_user_idx') IS NOT NULL THEN
    DROP INDEX IF EXISTS public.idx_notification_jobs_user_id;
  END IF;

  IF to_regclass('public.notification_logs_job_idx') IS NOT NULL THEN
    DROP INDEX IF EXISTS public.idx_notification_logs_job_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_storage_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.storage_path IS NOT NULL AND length(trim(OLD.storage_path)) > 0 THEN
    INSERT INTO public.storage_cleanup_queue (bucket_id, storage_path)
    VALUES ('gratitude-media', OLD.storage_path)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_deleted_attachment ON public.gratitude_attachments;
CREATE TRIGGER trigger_cleanup_deleted_attachment
AFTER DELETE ON public.gratitude_attachments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_storage_cleanup();

CREATE OR REPLACE FUNCTION public.delete_current_user_cascade()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = '28000';
  END IF;

  INSERT INTO public.deleted_users_tombstone (user_id_hash)
  VALUES (encode(extensions.digest(v_user_id::text, 'sha256'), 'hex'))
  ON CONFLICT (user_id_hash) DO UPDATE
    SET deleted_at = now();

  DELETE FROM public.ai_usage               WHERE user_id = v_user_id;
  DELETE FROM public.gratitude_attachments  WHERE user_id = v_user_id;
  DELETE FROM public.gratitude_entries      WHERE user_id = v_user_id;
  DELETE FROM public.mood_insight_snapshots WHERE user_id = v_user_id;
  DELETE FROM public.notification_jobs      WHERE user_id = v_user_id;
  DELETE FROM public.push_tokens            WHERE user_id = v_user_id;
  DELETE FROM public.streaks                WHERE user_id = v_user_id;
  DELETE FROM public.profiles               WHERE id      = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_profile_timezone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.timezone IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone
  ) THEN
    RAISE EXCEPTION 'Invalid IANA timezone: %', NEW.timezone
      USING errcode = '22023';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_users_for_next_hour_optimized()
RETURNS TABLE(user_id uuid, timezone text, notification_time text, language text, tokens text[])
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
    WITH eligible_profiles AS (
      SELECT p.id, p.timezone, p.notification_time, p.language
      FROM public.profiles p
      WHERE p.onboarded = true
        AND p.timezone IS NOT NULL
        AND p.notification_time IS NOT NULL
    ),
    profile_tokens AS (
      SELECT pt.user_id, array_agg(pt.token ORDER BY pt.created_at DESC) AS tokens
      FROM public.push_tokens pt
      GROUP BY pt.user_id
    ),
    notification_windows AS (
      SELECT
        ep.id AS user_id,
        ep.timezone,
        ep.notification_time,
        ep.language,
        date_trunc('minute', timezone(ep.timezone, now())) AS local_now,
        date_trunc('minute', timezone(ep.timezone, now()) + interval '1 hour') AS local_next_hour
      FROM eligible_profiles ep
    )
    SELECT
      nw.user_id,
      nw.timezone,
      nw.notification_time::text,
      nw.language,
      pt.tokens
    FROM notification_windows nw
    JOIN profile_tokens pt ON pt.user_id = nw.user_id
    WHERE coalesce(array_length(pt.tokens, 1), 0) > 0
      AND nw.notification_time::time = (nw.local_next_hour)::time;
END;
$$;

DO $$
DECLARE
  v_fn regprocedure;
BEGIN
  FOR v_fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(ARRAY[
        'add_gratitude_statement',
        'attach_media_to_statement',
        'calculate_streak',
        'check_username_availability',
        'consume_ai_usage',
        'delete_attachment',
        'delete_current_user_cascade',
        'delete_gratitude_entry_by_date',
        'delete_gratitude_statement',
        'edit_gratitude_statement',
        'get_entry_dates_for_month',
        'get_gratitude_entries_paginated',
        'get_latest_mood_insight_snapshot',
        'get_mood_analytics',
        'get_multiple_random_active_prompts',
        'get_random_active_prompt',
        'get_random_gratitude_entry',
        'get_recent_statement_count',
        'get_user_gratitude_entries_count',
        'list_attachments_for_date',
        'recalculate_user_streak',
        'register_push_token',
        'set_daily_gratitude_statements',
        'set_notifications_enabled',
        'set_statement_mood',
        'unregister_push_token'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM public, anon', v_fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
  END LOOP;

  FOR v_fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(ARRAY[
        'check_is_pro_update',
        'enqueue_storage_cleanup',
        'handle_new_user',
        'set_updated_at',
        'trigger_wrapper_update_user_streak',
        'update_updated_at_column',
        'update_user_streak',
        'validate_profile_timezone'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM public, anon, authenticated', v_fn);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
