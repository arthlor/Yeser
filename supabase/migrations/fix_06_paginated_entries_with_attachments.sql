-- fix_06_paginated_entries_with_attachments.sql
--
-- Canonical definition of get_gratitude_entries_paginated. Supersedes:
--   - supabase/migrations/20251216_rls_performance_and_pagination.sql
--   - supabase/migrations/20260412_refactor_search_and_personalized_notifications.sql
--   - the `get_gratitude_entries_paginated` override inside
--     gratitude_media_migration.sql
--
-- Key changes vs previous versions:
--   * Always returns `attachments jsonb` (aggregated from public.gratitude_attachments)
--   * Skips empty entries (jsonb_array_length(statements) = 0)
--   * Single overload with optional p_search_term so there is no risk of
--     a search-less build overwriting the attachments column again.

begin;

drop function if exists public.get_gratitude_entries_paginated(integer, integer);
drop function if exists public.get_gratitude_entries_paginated(integer, integer, text);

create or replace function public.get_gratitude_entries_paginated(
  p_page integer default 0,
  p_limit integer default 20,
  p_search_term text default null
)
returns table (
  id uuid,
  user_id uuid,
  entry_date date,
  statements jsonb,
  moods jsonb,
  attachments jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint,
  has_more boolean
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_offset integer;
  v_total bigint;
  v_search_term text := nullif(trim(p_search_term), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_page < 0 then
    raise exception 'Page must be non-negative' using errcode = '22003';
  end if;

  if p_limit < 1 or p_limit > 100 then
    raise exception 'Limit must be between 1 and 100' using errcode = '22003';
  end if;

  v_offset := p_page * p_limit;

  select count(*)
    into v_total
  from public.gratitude_entries ge
  where ge.user_id = v_user_id
    and coalesce(jsonb_array_length(ge.statements), 0) > 0
    and (
      v_search_term is null
      or exists (
        select 1
        from jsonb_array_elements_text(ge.statements) as statement_text(value)
        where statement_text.value ilike '%' || v_search_term || '%'
      )
    );

  return query
    with base as (
      select ge.*
      from public.gratitude_entries ge
      where ge.user_id = v_user_id
        and coalesce(jsonb_array_length(ge.statements), 0) > 0
        and (
          v_search_term is null
          or exists (
            select 1
            from jsonb_array_elements_text(ge.statements) as statement_text(value)
            where statement_text.value ilike '%' || v_search_term || '%'
          )
        )
      order by ge.entry_date desc
      limit p_limit
      offset v_offset
    )
    select
      b.id,
      b.user_id,
      b.entry_date,
      b.statements,
      b.moods,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'statement_index', a.statement_index,
              'kind', a.kind,
              'storage_path', a.storage_path,
              'mime_type', a.mime_type,
              'bytes', a.bytes,
              'duration_ms', a.duration_ms,
              'width', a.width,
              'height', a.height,
              'transcript', a.transcript,
              'created_at', a.created_at
            )
            order by a.created_at asc
          )
          from public.gratitude_attachments a
          where a.entry_id = b.id
        ),
        '[]'::jsonb
      ) as attachments,
      b.created_at,
      b.updated_at,
      v_total as total_count,
      (v_offset + p_limit < v_total) as has_more
    from base b
    order by b.entry_date desc;
end;
$function$;

grant execute on function public.get_gratitude_entries_paginated(integer, integer, text) to authenticated;

comment on function public.get_gratitude_entries_paginated(integer, integer, text) is
  'Paginated gratitude entries for auth.uid() with optional search. Always includes an attachments jsonb aggregate.';

notify pgrst, 'reload schema';

commit;
