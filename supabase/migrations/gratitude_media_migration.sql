-- ============================================================================
-- gratitude_media_migration.sql
--
-- Adds image + voice attachments to gratitude statements.
--
-- Run this file in Supabase → SQL Editor against your project. It is
-- idempotent; safe to re-run. After it succeeds you should:
--   1. Verify bucket  : Storage → "gratitude-media" (Private)
--   2. Verify policies: Storage → gratitude-media → Policies (4 rows)
--   3. Regenerate TS  : npx supabase gen types typescript --project-id <ref> \
--                         > src/types/supabase.types.ts
--   4. Rebuild native (EAS) — new iOS/Android permissions require a build,
--                             they are NOT pickable via OTA update.
--
-- Scope:
--   * Table           public.gratitude_attachments
--   * RLS + indexes
--   * RPCs            attach_media_to_statement, delete_attachment,
--                     list_attachments_for_date, get_gratitude_entries_paginated
--                     (extended to return attachments aggregate)
--   * Re-indexing     edit/delete hooks keep statement_index contract with moods
--   * Storage bucket  gratitude-media + per-user-folder policies
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gratitude_attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id)            ON DELETE CASCADE,
  entry_id        uuid NOT NULL REFERENCES public.gratitude_entries(id) ON DELETE CASCADE,
  entry_date      date NOT NULL,
  statement_index integer NOT NULL CHECK (statement_index >= 0),
  kind            text    NOT NULL CHECK (kind IN ('image', 'audio')),
  storage_path    text    NOT NULL UNIQUE,
  mime_type       text    NOT NULL,
  bytes           integer NOT NULL CHECK (bytes > 0 AND bytes <= 16 * 1024 * 1024),
  duration_ms     integer NULL CHECK (duration_ms IS NULL OR (duration_ms > 0 AND duration_ms <= 120000)),
  width           integer NULL CHECK (width  IS NULL OR width  > 0),
  height          integer NULL CHECK (height IS NULL OR height > 0),
  transcript      text    NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gratitude_attachments_user_date
  ON public.gratitude_attachments(user_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_gratitude_attachments_entry
  ON public.gratitude_attachments(entry_id, statement_index);

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.gratitude_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gratitude_attachments_select_own  ON public.gratitude_attachments;
DROP POLICY IF EXISTS gratitude_attachments_insert_own  ON public.gratitude_attachments;
DROP POLICY IF EXISTS gratitude_attachments_update_own  ON public.gratitude_attachments;
DROP POLICY IF EXISTS gratitude_attachments_delete_own  ON public.gratitude_attachments;

CREATE POLICY gratitude_attachments_select_own
  ON public.gratitude_attachments
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY gratitude_attachments_insert_own
  ON public.gratitude_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY gratitude_attachments_update_own
  ON public.gratitude_attachments
  FOR UPDATE
  TO authenticated
  USING      (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY gratitude_attachments_delete_own
  ON public.gratitude_attachments
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Direct SELECTs are allowed via RLS above, but writes go through RPCs only.
REVOKE INSERT, UPDATE, DELETE ON public.gratitude_attachments FROM authenticated, anon;
GRANT  SELECT                  ON public.gratitude_attachments TO   authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC: attach_media_to_statement
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attach_media_to_statement(
  p_entry_date      date,
  p_statement_index integer,
  p_kind            text,
  p_storage_path    text,
  p_mime_type       text,
  p_bytes           integer,
  p_duration_ms     integer DEFAULT NULL,
  p_width           integer DEFAULT NULL,
  p_height          integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry_id uuid;
  v_len integer;
  v_new_id uuid;
  v_expected_prefix text;
  v_existing_count integer;
  v_daily_cap CONSTANT integer := 10;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_kind NOT IN ('image', 'audio') THEN
    RAISE EXCEPTION 'Invalid attachment kind: %', p_kind USING ERRCODE = '22023';
  END IF;

  -- Enforce that the storage path lives under the user's own folder.
  v_expected_prefix := v_user_id::text || '/';
  IF p_storage_path IS NULL OR position(v_expected_prefix IN p_storage_path) <> 1 THEN
    RAISE EXCEPTION 'Storage path must start with %', v_expected_prefix USING ERRCODE = '22023';
  END IF;

  SELECT id, coalesce(jsonb_array_length(statements), 0)
    INTO v_entry_id, v_len
  FROM public.gratitude_entries
  WHERE user_id = v_user_id AND entry_date = p_entry_date
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found for date %', p_entry_date USING ERRCODE = 'P0002';
  END IF;

  IF p_statement_index < 0 OR p_statement_index >= v_len THEN
    RAISE EXCEPTION 'Invalid statement index % (length %)', p_statement_index, v_len
      USING ERRCODE = '22003';
  END IF;

  -- Per-day cap per kind. Keep the row lock from the entry above in effect so
  -- two concurrent uploads can't both race past the limit.
  SELECT count(*) INTO v_existing_count
  FROM public.gratitude_attachments
  WHERE user_id   = v_user_id
    AND entry_date = p_entry_date
    AND kind       = p_kind;

  IF v_existing_count >= v_daily_cap THEN
    RAISE EXCEPTION 'ATTACHMENT_DAILY_LIMIT_REACHED:%:%', p_kind, v_daily_cap
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.gratitude_attachments (
    user_id, entry_id, entry_date, statement_index,
    kind, storage_path, mime_type, bytes,
    duration_ms, width, height
  ) VALUES (
    v_user_id, v_entry_id, p_entry_date, p_statement_index,
    p_kind, p_storage_path, p_mime_type, p_bytes,
    p_duration_ms, p_width, p_height
  )
  RETURNING id INTO v_new_id;

  -- Touch the parent entry so query cache invalidation behaves like a normal edit.
  UPDATE public.gratitude_entries
  SET updated_at = now()
  WHERE id = v_entry_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_media_to_statement(
  date, integer, text, text, text, integer, integer, integer, integer
) FROM public;
GRANT EXECUTE ON FUNCTION public.attach_media_to_statement(
  date, integer, text, text, text, integer, integer, integer, integer
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC: delete_attachment
-- ---------------------------------------------------------------------------
-- Returns the storage_path so the client can remove the object afterwards
-- (Postgres→Storage deletion via http is avoided on purpose; one round-trip
-- from the client is simpler and auditable).
CREATE OR REPLACE FUNCTION public.delete_attachment(p_attachment_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_path    text;
  v_entry_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  DELETE FROM public.gratitude_attachments
  WHERE id = p_attachment_id AND user_id = v_user_id
  RETURNING storage_path, entry_id
    INTO v_path, v_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attachment not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.gratitude_entries
  SET updated_at = now()
  WHERE id = v_entry_id;

  RETURN v_path;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_attachment(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_attachment(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC: list_attachments_for_date  (optional but handy)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_attachments_for_date(p_entry_date date)
RETURNS TABLE (
  id              uuid,
  statement_index integer,
  kind            text,
  storage_path    text,
  mime_type       text,
  bytes           integer,
  duration_ms     integer,
  width           integer,
  height          integer,
  transcript      text,
  created_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  SELECT a.id, a.statement_index, a.kind, a.storage_path, a.mime_type,
         a.bytes, a.duration_ms, a.width, a.height, a.transcript, a.created_at
  FROM public.gratitude_attachments a
  WHERE a.user_id = v_user_id AND a.entry_date = p_entry_date
  ORDER BY a.statement_index, a.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_attachments_for_date(date) FROM public;
GRANT EXECUTE ON FUNCTION public.list_attachments_for_date(date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Re-index attachments when a statement is deleted / edited
-- ---------------------------------------------------------------------------
-- The existing delete_gratitude_statement re-keys moods; we mirror that for
-- attachments. We REPLACE the function instead of trying to wrap it, so the
-- whole operation stays in a single transaction and atomic.

CREATE OR REPLACE FUNCTION public.delete_gratitude_statement(
  p_entry_date      date,
  p_statement_index integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row_id uuid;
  v_statements jsonb;
  v_moods jsonb;
  v_len int;
  v_new_statements jsonb := '[]'::jsonb;
  v_new_moods jsonb := '{}'::jsonb;
  v_i int;
  v_k text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT id, coalesce(statements, '[]'::jsonb), coalesce(moods, '{}'::jsonb)
    INTO v_row_id, v_statements, v_moods
  FROM public.gratitude_entries
  WHERE user_id = v_user_id AND entry_date = p_entry_date
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found for date %', p_entry_date USING ERRCODE = 'P0002';
  END IF;

  v_len := coalesce(jsonb_array_length(v_statements), 0);
  IF p_statement_index < 0 OR p_statement_index >= v_len THEN
    RAISE EXCEPTION 'Invalid statement index %', p_statement_index USING ERRCODE = '22003';
  END IF;

  -- Rebuild statements[] without the deleted index.
  FOR v_i IN 0 .. v_len - 1 LOOP
    IF v_i <> p_statement_index THEN
      v_new_statements := v_new_statements || (v_statements -> v_i);
    END IF;
  END LOOP;

  -- Re-key moods{} by shifting everything above p_statement_index down by one.
  FOR v_k IN SELECT jsonb_object_keys(v_moods) LOOP
    IF v_k::int < p_statement_index THEN
      v_new_moods := v_new_moods || jsonb_build_object(v_k, v_moods -> v_k);
    ELSIF v_k::int > p_statement_index THEN
      v_new_moods := v_new_moods || jsonb_build_object((v_k::int - 1)::text, v_moods -> v_k);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_new_statements) = 0 THEN
    -- Last statement removed → delete the entry row (cascades to attachments).
    DELETE FROM public.gratitude_entries WHERE id = v_row_id;
    RETURN;
  END IF;

  UPDATE public.gratitude_entries
  SET statements = v_new_statements,
      moods      = v_new_moods,
      updated_at = now()
  WHERE id = v_row_id;

  -- Shift attachment indexes atomically, then drop anything attached to the
  -- deleted statement. Order matters: delete first, then shift.
  DELETE FROM public.gratitude_attachments
  WHERE user_id = v_user_id
    AND entry_date = p_entry_date
    AND statement_index = p_statement_index;

  UPDATE public.gratitude_attachments
  SET statement_index = statement_index - 1
  WHERE user_id = v_user_id
    AND entry_date = p_entry_date
    AND statement_index > p_statement_index;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Paginated reader — extend return with attachments aggregate
-- ---------------------------------------------------------------------------
-- We keep the same signature so existing callers do not break; the extra
-- `attachments` column is additive. Postgres refuses to CREATE OR REPLACE a
-- function when the RETURNS shape changes (42P13), so we DROP both overloads
-- first. Safe because the app talks to them only by name + args.

DROP FUNCTION IF EXISTS public.get_gratitude_entries_paginated(integer, integer, text);
DROP FUNCTION IF EXISTS public.get_gratitude_entries_paginated(integer, integer);

CREATE OR REPLACE FUNCTION public.get_gratitude_entries_paginated(
  p_page        integer DEFAULT 0,
  p_limit       integer DEFAULT 20,
  p_search_term text    DEFAULT NULL
)
RETURNS TABLE (
  id           uuid,
  user_id      uuid,
  entry_date   date,
  statements   jsonb,
  moods        jsonb,
  attachments  jsonb,
  created_at   timestamptz,
  updated_at   timestamptz,
  total_count  bigint,
  has_more     boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid   := auth.uid();
  v_offset      integer;
  v_total       bigint;
  v_search_term text   := nullif(trim(p_search_term), '');
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

  SELECT count(*) INTO v_total
  FROM public.gratitude_entries e
  WHERE e.user_id = v_user_id
    AND (
      v_search_term IS NULL
      OR e.statements::text ILIKE '%' || v_search_term || '%'
    );

  RETURN QUERY
  SELECT e.id,
         e.user_id,
         e.entry_date,
         e.statements,
         e.moods,
         COALESCE((
           SELECT jsonb_agg(
                    jsonb_build_object(
                      'id',              a.id,
                      'statement_index', a.statement_index,
                      'kind',            a.kind,
                      'storage_path',    a.storage_path,
                      'mime_type',       a.mime_type,
                      'bytes',           a.bytes,
                      'duration_ms',     a.duration_ms,
                      'width',           a.width,
                      'height',          a.height,
                      'transcript',      a.transcript,
                      'created_at',      a.created_at
                    )
                    ORDER BY a.statement_index, a.created_at
                  )
           FROM public.gratitude_attachments a
           WHERE a.entry_id = e.id
         ), '[]'::jsonb) AS attachments,
         e.created_at,
         e.updated_at,
         v_total                              AS total_count,
         (v_offset + p_limit) < v_total       AS has_more
  FROM public.gratitude_entries e
  WHERE e.user_id = v_user_id
    AND (
      v_search_term IS NULL
      OR e.statements::text ILIKE '%' || v_search_term || '%'
    )
  ORDER BY e.entry_date DESC
  LIMIT  p_limit
  OFFSET v_offset;
END;
$$;

-- The 2-arg overload stays compatible by forwarding to the 3-arg version.
CREATE OR REPLACE FUNCTION public.get_gratitude_entries_paginated(
  p_page  integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id           uuid,
  user_id      uuid,
  entry_date   date,
  statements   jsonb,
  moods        jsonb,
  attachments  jsonb,
  created_at   timestamptz,
  updated_at   timestamptz,
  total_count  bigint,
  has_more     boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_gratitude_entries_paginated(p_page, p_limit, NULL::text);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Storage bucket + per-user-folder policies
-- ---------------------------------------------------------------------------
-- NOTE: If your Supabase project blocks direct DDL on storage.* from the SQL
-- Editor (some self-hosted setups do), create the bucket and policies in the
-- Dashboard manually — the names/clauses below are the source of truth.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gratitude-media',
  'gratitude-media',
  false,
  16 * 1024 * 1024,              -- 16 MB hard ceiling
  ARRAY[
    'image/jpeg','image/png','image/webp','image/heic',
    'audio/m4a','audio/mp4','audio/aac','audio/mpeg','audio/webm','audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit     = EXCLUDED.file_size_limit,
    allowed_mime_types  = EXCLUDED.allowed_mime_types,
    public              = EXCLUDED.public;

DROP POLICY IF EXISTS gratitude_media_select_own_folder ON storage.objects;
DROP POLICY IF EXISTS gratitude_media_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS gratitude_media_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS gratitude_media_delete_own_folder ON storage.objects;

CREATE POLICY gratitude_media_select_own_folder
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'gratitude-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY gratitude_media_insert_own_folder
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gratitude-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY gratitude_media_update_own_folder
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'gratitude-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'gratitude-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY gratitude_media_delete_own_folder
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gratitude-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 9. PostgREST reload
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
