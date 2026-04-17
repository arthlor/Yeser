-- fix_12_delete_user_edge_function.sql
--
-- NOTE: the account-deletion flow ultimately needs a Deno edge function at
-- supabase/functions/delete-user/index.ts (the client calls
-- functions.invoke('delete-user')). This SQL companion provides:
--   1. A server-side RPC `delete_current_user_cascade()` that removes every
--      `public.*` row that belongs to the caller. The edge function should
--      1) call this RPC with the user's JWT, then
--      2) call `auth.admin.deleteUser(user.id)` with the service_role key.
--   2. A safety UPDATE that makes sure all existing ON DELETE policies on
--      user-scoped tables are CASCADE (so `auth.admin.deleteUser` alone can
--      tidy up if the RPC is skipped).
--
-- Re-runnable; no data is lost by running twice.

begin;

-- Cascade FKs so the auth admin delete is sufficient as a fallback. ----------

alter table public.ai_usage
  drop constraint if exists ai_usage_user_id_fkey,
  add constraint ai_usage_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.gratitude_entries
  drop constraint if exists gratitude_entries_user_id_fkey,
  add constraint gratitude_entries_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.gratitude_attachments
  drop constraint if exists gratitude_attachments_user_id_fkey,
  add constraint gratitude_attachments_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.gratitude_attachments
  drop constraint if exists gratitude_attachments_entry_id_fkey,
  add constraint gratitude_attachments_entry_id_fkey
    foreign key (entry_id) references public.gratitude_entries(id) on delete cascade;

alter table public.mood_insight_snapshots
  drop constraint if exists mood_insight_snapshots_user_id_fkey,
  add constraint mood_insight_snapshots_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.streaks
  drop constraint if exists streaks_user_id_fkey,
  add constraint streaks_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;

alter table public.push_tokens
  drop constraint if exists push_tokens_user_id_fkey,
  add constraint push_tokens_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.notification_jobs
  drop constraint if exists notification_jobs_user_id_fkey,
  add constraint notification_jobs_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

-- Client-callable best-effort cascade. The real auth.users deletion must
-- still be issued by a service_role edge function.
create or replace function public.delete_current_user_cascade()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  delete from public.ai_usage              where user_id = v_user_id;
  delete from public.gratitude_attachments where user_id = v_user_id;
  delete from public.gratitude_entries     where user_id = v_user_id;
  delete from public.mood_insight_snapshots where user_id = v_user_id;
  delete from public.notification_jobs     where user_id = v_user_id;
  delete from public.push_tokens           where user_id = v_user_id;
  delete from public.streaks               where user_id = v_user_id;
  delete from public.profiles              where id      = v_user_id;
end;
$function$;

grant execute on function public.delete_current_user_cascade() to authenticated;

notify pgrst, 'reload schema';

commit;
