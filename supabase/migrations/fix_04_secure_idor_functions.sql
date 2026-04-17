-- fix_04_secure_idor_functions.sql
--
-- Two SECURITY DEFINER functions currently accept `p_user_id` without
-- verifying it matches auth.uid(), so any authenticated user could enumerate
-- another user's gratitude entries. We lock them down and (for
-- get_entry_dates_for_month) drop the p_user_id parameter entirely so the
-- client can't pass a spoofed value.
--
-- Both new signatures are kept compatible: the old
-- get_entry_dates_for_month(uuid,int,int) remains as a shim that enforces
-- auth.uid() so nothing breaks if a client has not been redeployed yet.

begin;

-- get_entry_dates_for_month: no longer trusts p_user_id ----------------------

create or replace function public.get_entry_dates_for_month(
  p_year integer,
  p_month integer
)
returns setof date
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

  return query
    select distinct entry_date
    from public.gratitude_entries
    where user_id = v_user_id
      and extract(year from entry_date) = p_year
      and extract(month from entry_date) = p_month
    order by entry_date asc;
end;
$function$;

grant execute on function public.get_entry_dates_for_month(integer, integer) to authenticated;

-- Backwards-compatible overload: ignores p_user_id and uses auth.uid() -------

create or replace function public.get_entry_dates_for_month(
  p_user_id uuid,
  p_year integer,
  p_month integer
)
returns setof date
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

  if p_user_id is distinct from v_user_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select * from public.get_entry_dates_for_month(p_year, p_month);
end;
$function$;

grant execute on function public.get_entry_dates_for_month(uuid, integer, integer) to authenticated;

-- get_random_gratitude_entry: drop the spoof-able parameter ------------------

drop function if exists public.get_random_gratitude_entry(uuid);

create or replace function public.get_random_gratitude_entry()
returns setof public.gratitude_entries
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

  return query
    select *
    from public.gratitude_entries
    where user_id = v_user_id
      and jsonb_array_length(statements) > 0
    order by random()
    limit 1;
end;
$function$;

grant execute on function public.get_random_gratitude_entry() to authenticated;

-- Backwards-compatible overload for clients that still send p_user_id.
create or replace function public.get_random_gratitude_entry(p_user_id uuid)
returns setof public.gratitude_entries
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

  if p_user_id is distinct from v_user_id then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select * from public.get_random_gratitude_entry();
end;
$function$;

grant execute on function public.get_random_gratitude_entry(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
