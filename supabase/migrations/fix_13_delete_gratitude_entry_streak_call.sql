-- fix_13_delete_gratitude_entry_streak_call.sql
--
-- Bug: public.delete_gratitude_entry_by_date calls `update_user_streak(v_user_id)`,
-- but update_user_streak is the 0-arg trigger function (see fix_08).
-- Result: every "delete whole entry" request fails with
--   "function public.update_user_streak(uuid) does not exist"
-- and the delete is rolled back.
--
-- The on_gratitude_entry_change trigger already calls recalculate_user_streak
-- on DELETE, so the explicit call in this RPC is redundant and we remove it.
-- We also drop the now-useless debugging branches.

begin;

create or replace function public.delete_gratitude_entry_by_date(p_entry_date date)
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

  if p_entry_date is null then
    raise exception 'Entry date cannot be null' using errcode = '22004';
  end if;

  delete from public.gratitude_entries
  where user_id = v_user_id
    and entry_date = p_entry_date;
  -- The on_gratitude_entry_change trigger handles streak recalculation.
end;
$function$;

grant execute on function public.delete_gratitude_entry_by_date(date) to authenticated;

notify pgrst, 'reload schema';

commit;
