-- fix_08_harmonize_streak_calculation.sql
--
-- Ensures calculate_streak, recalculate_user_streak, and the
-- on_gratitude_entry_change trigger all agree on:
--   * "today is OK if we also counted yesterday" grace rule
--   * empty statements arrays do NOT count as a streak day
--   * longest_streak is derived by a single full-scan
--
-- After running this the trigger simply calls recalculate_user_streak, so
-- the app never sees a value that disagrees between the trigger-driven
-- streak and the RPC-driven one.

begin;

create or replace function public.calculate_streak(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_current_streak integer := 0;
  v_check_date date := current_date;
  v_has_entry boolean;
  v_grace_used boolean := false;
begin
  if p_user_id is null then
    raise exception 'User ID cannot be null';
  end if;

  loop
    select exists(
      select 1
      from public.gratitude_entries
      where user_id = p_user_id
        and entry_date = v_check_date
        and coalesce(jsonb_array_length(statements), 0) > 0
    ) into v_has_entry;

    if v_has_entry then
      v_current_streak := v_current_streak + 1;
      v_check_date := v_check_date - interval '1 day';
    elsif v_check_date = current_date and not v_grace_used then
      -- Grace: missing "today" doesn't break the streak if yesterday exists.
      v_grace_used := true;
      v_check_date := v_check_date - interval '1 day';
    else
      exit;
    end if;

    if v_current_streak >= 3650 then
      exit; -- safety
    end if;
  end loop;

  return v_current_streak;
end;
$function$;

grant execute on function public.calculate_streak(uuid) to authenticated;

create or replace function public.recalculate_user_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_current_streak int := 0;
  v_longest_streak int := 0;
  v_running_streak int := 0;
  v_prev_date date := null;
  v_last_entry_date date := null;
  entry_record record;
begin
  if p_user_id is null then
    raise exception 'User ID cannot be null';
  end if;

  v_current_streak := public.calculate_streak(p_user_id);

  for entry_record in
    select entry_date
    from public.gratitude_entries
    where user_id = p_user_id
      and coalesce(jsonb_array_length(statements), 0) > 0
    order by entry_date asc
  loop
    if v_prev_date is null then
      v_running_streak := 1;
    elsif entry_record.entry_date = v_prev_date + interval '1 day' then
      v_running_streak := v_running_streak + 1;
    elsif entry_record.entry_date = v_prev_date then
      -- Duplicate day (shouldn't happen, but be safe).
      null;
    else
      v_running_streak := 1;
    end if;

    if v_running_streak > v_longest_streak then
      v_longest_streak := v_running_streak;
    end if;

    v_prev_date := entry_record.entry_date;
    v_last_entry_date := entry_record.entry_date;
  end loop;

  v_longest_streak := greatest(v_longest_streak, v_current_streak);

  insert into public.streaks (user_id, current_streak, longest_streak, last_entry_date, created_at, updated_at)
  values (p_user_id, v_current_streak, v_longest_streak, v_last_entry_date, now(), now())
  on conflict (user_id) do update
    set current_streak = excluded.current_streak,
        longest_streak = greatest(public.streaks.longest_streak, excluded.longest_streak),
        last_entry_date = excluded.last_entry_date,
        updated_at = now();
end;
$function$;

grant execute on function public.recalculate_user_streak(uuid) to authenticated;

-- Trigger wrapper delegates to the RPC so there is one single source of truth.
create or replace function public.update_user_streak()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
begin
  v_user_id := coalesce(new.user_id, old.user_id);
  if v_user_id is not null then
    perform public.recalculate_user_streak(v_user_id);
  end if;
  return coalesce(new, old);
end;
$function$;

-- Recreate the trigger to pick up the new function body.
drop trigger if exists on_gratitude_entry_change on public.gratitude_entries;
create trigger on_gratitude_entry_change
after insert or update or delete
on public.gratitude_entries
for each row execute function public.update_user_streak();

notify pgrst, 'reload schema';

commit;
