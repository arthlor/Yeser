-- fix_10_cleanup_empty_moods.sql
--
-- Legacy rows written when the client passed '' instead of NULL end up with
-- moods like {"0":""}. The set_statement_mood RPC branch treats NULL as
-- "clear" but empty string as "store literal empty". This migration:
--   1. strips all empty-string entries from gratitude_entries.moods
--   2. hardens set_statement_mood so it treats '' exactly like NULL going forward
--
-- Safe and idempotent.

begin;

with cleaned as (
  select
    id,
    coalesce(
      (
        select jsonb_object_agg(key, value)
        from jsonb_each_text(moods)
        where nullif(value, '') is not null
      ),
      '{}'::jsonb
    ) as new_moods
  from public.gratitude_entries
  where moods is not null
    and moods <> '{}'::jsonb
)
update public.gratitude_entries ge
set moods = cleaned.new_moods
from cleaned
where cleaned.id = ge.id
  and ge.moods is distinct from cleaned.new_moods;

create or replace function public.set_statement_mood(
  p_entry_date date,
  p_statement_index integer,
  p_mood text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_row_id uuid;
  v_moods jsonb;
  v_len int;
  v_clean_mood text := nullif(trim(coalesce(p_mood, '')), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select id, coalesce(moods, '{}'::jsonb), coalesce(jsonb_array_length(statements), 0)
    into v_row_id, v_moods, v_len
  from public.gratitude_entries
  where user_id = v_user_id and entry_date = p_entry_date
  for update;

  if not found then
    raise exception 'Entry not found for date %', p_entry_date using errcode = 'P0002';
  end if;

  if p_statement_index < 0 or p_statement_index >= v_len then
    raise exception 'Invalid statement index % (length %)', p_statement_index, v_len
      using errcode = '22003';
  end if;

  if v_clean_mood is null then
    update public.gratitude_entries
    set moods = v_moods - (p_statement_index)::text,
        updated_at = now()
    where id = v_row_id;
  else
    update public.gratitude_entries
    set moods = jsonb_set(v_moods, array[(p_statement_index)::text], to_jsonb(v_clean_mood), true),
        updated_at = now()
    where id = v_row_id;
  end if;
end;
$function$;

grant execute on function public.set_statement_mood(date, integer, text) to authenticated;

notify pgrst, 'reload schema';

commit;
