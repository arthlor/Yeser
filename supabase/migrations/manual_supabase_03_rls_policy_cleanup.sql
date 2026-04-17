BEGIN;

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
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

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
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "streaks_select_own" ON public.streaks;
CREATE POLICY "streaks_select_own" ON public.streaks
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "authenticated_users_can_delete_own_entries" ON public.gratitude_entries;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_entries" ON public.gratitude_entries;
DROP POLICY IF EXISTS "authenticated_users_can_read_own_entries" ON public.gratitude_entries;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_entries" ON public.gratitude_entries;

DROP POLICY IF EXISTS "authenticated_users_can_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can delete their own push tokens." ON public.push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens." ON public.push_tokens;
DROP POLICY IF EXISTS "Users can view their own push tokens." ON public.push_tokens;

DROP POLICY IF EXISTS "authenticated_users_can_read_own_streaks" ON public.streaks;

NOTIFY pgrst, 'reload schema';

COMMIT;
