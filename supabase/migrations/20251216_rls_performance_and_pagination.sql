-- Migration: 20251216_rls_performance_and_pagination.sql
-- Purpose: Optimize RLS policies to use (SELECT auth.uid()) pattern and add paginated entries RPC
-- Author: Antigravity AI Assistant
-- Date: 2025-12-16

-- ============================================================================
-- PART 1: RLS POLICY OPTIMIZATIONS
-- Using (SELECT auth.uid()) instead of auth.uid() for better query planning
-- ============================================================================

-- ---------------------------------------------------------------------------
-- GRATITUDE_ENTRIES TABLE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "gratitude_entries_delete_own" ON public.gratitude_entries;
CREATE POLICY "gratitude_entries_delete_own" ON public.gratitude_entries
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "gratitude_entries_insert_own" ON public.gratitude_entries;
CREATE POLICY "gratitude_entries_insert_own" ON public.gratitude_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "gratitude_entries_select_own" ON public.gratitude_entries;
CREATE POLICY "gratitude_entries_select_own" ON public.gratitude_entries
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "gratitude_entries_update_own" ON public.gratitude_entries;
CREATE POLICY "gratitude_entries_update_own" ON public.gratitude_entries
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- PROFILES TABLE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- PUSH_TOKENS TABLE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "push_tokens_delete_own" ON public.push_tokens;
CREATE POLICY "push_tokens_delete_own" ON public.push_tokens
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "push_tokens_insert_own" ON public.push_tokens;
CREATE POLICY "push_tokens_insert_own" ON public.push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "push_tokens_select_own" ON public.push_tokens;
CREATE POLICY "push_tokens_select_own" ON public.push_tokens
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "push_tokens_update_own" ON public.push_tokens;
CREATE POLICY "push_tokens_update_own" ON public.push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- STREAKS TABLE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "streaks_select_own" ON public.streaks;
CREATE POLICY "streaks_select_own" ON public.streaks
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- STORAGE.OBJECTS TABLE (Avatars)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "avatars_delete_own_folder" ON storage.objects;
CREATE POLICY "avatars_delete_own_folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "avatars_insert_own_folder" ON storage.objects;
CREATE POLICY "avatars_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "avatars_select_own_folder" ON storage.objects;
CREATE POLICY "avatars_select_own_folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);


-- ============================================================================
-- PART 2: PAGINATED GRATITUDE ENTRIES RPC FUNCTION
-- Combines count and fetch into a single optimized query
-- ============================================================================

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
DECLARE
  v_user_id uuid := auth.uid();
  v_offset integer;
  v_total bigint;
BEGIN
  -- Authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  
  -- Validate inputs
  IF p_page < 0 THEN
    RAISE EXCEPTION 'Page must be non-negative' USING ERRCODE = '22003';
  END IF;
  
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100' USING ERRCODE = '22003';
  END IF;
  
  v_offset := p_page * p_limit;
  
  -- Get total count once
  SELECT COUNT(*) INTO v_total
  FROM public.gratitude_entries ge
  WHERE ge.user_id = v_user_id;
  
  -- Return paginated results with metadata
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
  ORDER BY ge.entry_date DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_gratitude_entries_paginated(integer, integer) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION public.get_gratitude_entries_paginated IS 
  'Returns paginated gratitude entries for the authenticated user with total count and has_more flag. 
   Optimized to perform count and fetch in a single database round-trip.';
