-- Harden backend caveats found by comparing the client with /database snapshots.
-- Re-runnable: all constraints, policies, and functions are replaced by name.

begin;

-- ---------------------------------------------------------------------------
-- Account deletion durability
-- ---------------------------------------------------------------------------

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

alter table public.notification_logs
  drop constraint if exists notification_logs_job_id_fkey,
  add constraint notification_logs_job_id_fkey
    foreign key (job_id) references public.notification_jobs(id) on delete cascade;

alter table public.streaks
  drop constraint if exists streaks_user_id_fkey,
  add constraint streaks_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Profile schema guardrails
-- ---------------------------------------------------------------------------

update public.profiles
set daily_gratitude_goal = 3
where daily_gratitude_goal is null
   or daily_gratitude_goal < 1
   or daily_gratitude_goal > 20;

alter table public.profiles
  alter column daily_gratitude_goal set default 3,
  alter column daily_gratitude_goal set not null;

alter table public.profiles
  drop constraint if exists profiles_daily_gratitude_goal_range,
  add constraint profiles_daily_gratitude_goal_range
    check (daily_gratitude_goal between 1 and 20);

-- ---------------------------------------------------------------------------
-- Uniqueness required by RPC/upsert contracts
-- ---------------------------------------------------------------------------

create unique index if not exists gratitude_entries_user_entry_date_uidx
  on public.gratitude_entries (user_id, entry_date);

create unique index if not exists mood_insight_snapshots_user_range_language_uidx
  on public.mood_insight_snapshots (user_id, range, language);

-- ---------------------------------------------------------------------------
-- Data API exposure boundaries
-- ---------------------------------------------------------------------------

alter table public.ai_usage enable row level security;
alter table public.mood_insight_snapshots enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.notification_logs enable row level security;
alter table public.gratitude_entries enable row level security;
alter table public.gratitude_attachments enable row level security;

revoke insert, update, delete on table public.ai_usage from anon, authenticated;
revoke all on table public.mood_insight_snapshots from anon, authenticated;
revoke all on table public.notification_jobs from anon, authenticated;
revoke all on table public.notification_logs from anon, authenticated;

-- Gratitude rows are read through normal client queries, but writes must go
-- through the security-definer RPCs below so free-tier rules cannot be bypassed.
revoke insert, update, delete on table public.gratitude_entries from anon, authenticated;
revoke insert, update, delete on table public.gratitude_attachments from anon, authenticated;

grant select on table public.ai_usage to authenticated;
grant all on table public.ai_usage to service_role;
grant select on table public.gratitude_entries to authenticated;
grant select on table public.gratitude_attachments to authenticated;
grant all on table public.mood_insight_snapshots to service_role;
grant all on table public.notification_jobs to service_role;
grant all on table public.notification_logs to service_role;

drop policy if exists "Service role can insert ai_usage" on public.ai_usage;
create policy "Service role can insert ai_usage"
  on public.ai_usage for insert to service_role
  with check (true);

-- Storage policy hardening: users may read/delete their own media, but only Pro
-- users may create/update gratitude-media objects.
drop policy if exists gratitude_media_insert_own_folder on storage.objects;
drop policy if exists gratitude_media_update_own_folder on storage.objects;

create policy gratitude_media_insert_own_folder
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gratitude-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and coalesce(p.is_pro, false) = true
    )
  );

create policy gratitude_media_update_own_folder
  on storage.objects for update to authenticated
  using (
    bucket_id = 'gratitude-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'gratitude-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and coalesce(p.is_pro, false) = true
    )
  );

-- ---------------------------------------------------------------------------
-- Paid/free RPC rules
-- ---------------------------------------------------------------------------

create or replace function public.add_gratitude_statement(
  p_entry_date date,
  p_statement text,
  p_mood text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_row_id uuid;
  v_statements jsonb;
  v_moods jsonb;
  v_index int;
  v_is_pro boolean := false;
  v_timezone text;
  v_today date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select coalesce(is_pro, false), timezone
    into v_is_pro, v_timezone
  from public.profiles
  where id = v_user_id;

  v_today := case
    when v_timezone is not null then (now() at time zone v_timezone)::date
    else current_date
  end;

  if not v_is_pro and p_entry_date <> v_today then
    raise exception 'PAST_ENTRY_REQUIRES_PRO'
      using errcode = 'P0001';
  end if;

  select id, coalesce(statements, '[]'::jsonb), coalesce(moods, '{}'::jsonb)
    into v_row_id, v_statements, v_moods
  from public.gratitude_entries
  where user_id = v_user_id and entry_date = p_entry_date
  for update;

  if found then
    v_index := coalesce(jsonb_array_length(v_statements), 0);

    if not v_is_pro and v_index >= 1 then
      raise exception 'FREE_DAILY_LIMIT_REACHED'
        using errcode = 'P0001';
    end if;

    update public.gratitude_entries
    set statements = v_statements || to_jsonb(p_statement),
        moods = case
          when p_mood is not null then
            jsonb_set(v_moods, array[(v_index)::text], to_jsonb(p_mood), true)
          else v_moods
        end,
        updated_at = now()
    where id = v_row_id;
  else
    insert into public.gratitude_entries (user_id, entry_date, statements, moods, created_at, updated_at)
    values (
      v_user_id,
      p_entry_date,
      ('[]'::jsonb || to_jsonb(p_statement)),
      case when p_mood is not null then jsonb_build_object('0', p_mood) else '{}'::jsonb end,
      now(),
      now()
    );
  end if;
end;
$function$;

create or replace function public.edit_gratitude_statement(
  p_entry_date date,
  p_statement_index integer,
  p_updated_statement text,
  p_mood text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_row_id uuid;
  v_statements jsonb;
  v_moods jsonb;
  v_len int;
  v_is_pro boolean := false;
  v_timezone text;
  v_today date;
  v_existing_mood text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select coalesce(is_pro, false), timezone
    into v_is_pro, v_timezone
  from public.profiles
  where id = v_user_id;

  v_today := case
    when v_timezone is not null then (now() at time zone v_timezone)::date
    else current_date
  end;

  if not v_is_pro and p_entry_date <> v_today then
    raise exception 'PAST_ENTRY_REQUIRES_PRO'
      using errcode = 'P0001';
  end if;

  select id, coalesce(statements, '[]'::jsonb), coalesce(moods, '{}'::jsonb)
    into v_row_id, v_statements, v_moods
  from public.gratitude_entries
  where user_id = v_user_id
    and entry_date = p_entry_date
  for update;

  if not found then
    raise exception 'Entry not found for date %', p_entry_date using errcode = 'P0002';
  end if;

  v_len := coalesce(jsonb_array_length(v_statements), 0);
  if p_statement_index < 0 or p_statement_index >= v_len then
    raise exception 'Invalid statement index %, length %', p_statement_index, v_len
      using errcode = '22003';
  end if;

  v_existing_mood := v_moods ->> (p_statement_index)::text;
  if not v_is_pro and p_mood is not null and p_mood is distinct from v_existing_mood then
    raise exception 'MOOD_EDITING_REQUIRES_PRO'
      using errcode = 'P0001';
  end if;

  update public.gratitude_entries
  set statements = jsonb_set(
        v_statements,
        array[(p_statement_index)::text],
        to_jsonb(p_updated_statement),
        true
      ),
      moods = case
        when p_mood is not null then
          jsonb_set(v_moods, array[(p_statement_index)::text], to_jsonb(p_mood), true)
        else v_moods
      end,
      updated_at = now()
  where id = v_row_id;
end;
$function$;

create or replace function public.delete_gratitude_statement(
  p_entry_date date,
  p_statement_index integer
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_row_id uuid;
  v_statements jsonb;
  v_moods jsonb;
  v_len int;
  v_new_statements jsonb := '[]'::jsonb;
  v_new_moods jsonb := '{}'::jsonb;
  v_i int;
  v_k text;
  v_is_pro boolean := false;
  v_timezone text;
  v_today date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select coalesce(is_pro, false), timezone
    into v_is_pro, v_timezone
  from public.profiles
  where id = v_user_id;

  v_today := case
    when v_timezone is not null then (now() at time zone v_timezone)::date
    else current_date
  end;

  if not v_is_pro and p_entry_date <> v_today then
    raise exception 'PAST_ENTRY_REQUIRES_PRO'
      using errcode = 'P0001';
  end if;

  select id, coalesce(statements, '[]'::jsonb), coalesce(moods, '{}'::jsonb)
    into v_row_id, v_statements, v_moods
  from public.gratitude_entries
  where user_id = v_user_id and entry_date = p_entry_date
  for update;

  if not found then
    raise exception 'Entry not found for date %', p_entry_date using errcode = 'P0002';
  end if;

  v_len := coalesce(jsonb_array_length(v_statements), 0);
  if p_statement_index < 0 or p_statement_index >= v_len then
    raise exception 'Invalid statement index %', p_statement_index using errcode = '22003';
  end if;

  for v_i in 0 .. v_len - 1 loop
    if v_i <> p_statement_index then
      v_new_statements := v_new_statements || (v_statements -> v_i);
    end if;
  end loop;

  for v_k in select jsonb_object_keys(v_moods) loop
    if v_k::int < p_statement_index then
      v_new_moods := v_new_moods || jsonb_build_object(v_k, v_moods -> v_k);
    elsif v_k::int > p_statement_index then
      v_new_moods := v_new_moods || jsonb_build_object((v_k::int - 1)::text, v_moods -> v_k);
    end if;
  end loop;

  if jsonb_array_length(v_new_statements) = 0 then
    delete from public.gratitude_entries where id = v_row_id;
    return;
  end if;

  update public.gratitude_entries
  set statements = v_new_statements,
      moods = v_new_moods,
      updated_at = now()
  where id = v_row_id;

  delete from public.gratitude_attachments
  where user_id = v_user_id
    and entry_date = p_entry_date
    and statement_index = p_statement_index;

  update public.gratitude_attachments
  set statement_index = statement_index - 1
  where user_id = v_user_id
    and entry_date = p_entry_date
    and statement_index > p_statement_index;
end;
$function$;

create or replace function public.delete_gratitude_entry_by_date(p_entry_date date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean := false;
  v_timezone text;
  v_today date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_entry_date is null then
    raise exception 'Entry date cannot be null' using errcode = '22004';
  end if;

  select coalesce(is_pro, false), timezone
    into v_is_pro, v_timezone
  from public.profiles
  where id = v_user_id;

  v_today := case
    when v_timezone is not null then (now() at time zone v_timezone)::date
    else current_date
  end;

  if not v_is_pro and p_entry_date <> v_today then
    raise exception 'PAST_ENTRY_REQUIRES_PRO'
      using errcode = 'P0001';
  end if;

  delete from public.gratitude_entries
  where user_id = v_user_id
    and entry_date = p_entry_date;
end;
$function$;

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
  v_is_pro boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select coalesce(is_pro, false)
    into v_is_pro
  from public.profiles
  where id = v_user_id;

  if not v_is_pro then
    raise exception 'MOOD_EDITING_REQUIRES_PRO'
      using errcode = 'P0001';
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

create or replace function public.attach_media_to_statement(
  p_entry_date date,
  p_statement_index integer,
  p_kind text,
  p_storage_path text,
  p_mime_type text,
  p_bytes integer,
  p_duration_ms integer default null::integer,
  p_width integer default null::integer,
  p_height integer default null::integer
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_entry_id uuid;
  v_len integer;
  v_new_id uuid;
  v_expected_prefix text;
  v_existing_count integer;
  v_daily_cap constant integer := 10;
  v_is_pro boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select coalesce(is_pro, false)
    into v_is_pro
  from public.profiles
  where id = v_user_id;

  if not v_is_pro then
    raise exception 'ATTACHMENTS_REQUIRE_PRO'
      using errcode = 'P0001';
  end if;

  if p_kind not in ('image', 'audio') then
    raise exception 'Invalid attachment kind: %', p_kind using errcode = '22023';
  end if;

  v_expected_prefix := v_user_id::text || '/';
  if p_storage_path is null or position(v_expected_prefix in p_storage_path) <> 1 then
    raise exception 'Storage path must start with %', v_expected_prefix using errcode = '22023';
  end if;

  select id, coalesce(jsonb_array_length(statements), 0)
    into v_entry_id, v_len
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

  select count(*) into v_existing_count
  from public.gratitude_attachments
  where user_id = v_user_id
    and entry_date = p_entry_date
    and kind = p_kind;

  if v_existing_count >= v_daily_cap then
    raise exception 'ATTACHMENT_DAILY_LIMIT_REACHED:%:%', p_kind, v_daily_cap
      using errcode = '23514';
  end if;

  insert into public.gratitude_attachments (
    user_id, entry_id, entry_date, statement_index,
    kind, storage_path, mime_type, bytes,
    duration_ms, width, height
  ) values (
    v_user_id, v_entry_id, p_entry_date, p_statement_index,
    p_kind, p_storage_path, p_mime_type, p_bytes,
    p_duration_ms, p_width, p_height
  )
  returning id into v_new_id;

  update public.gratitude_entries
  set updated_at = now()
  where id = v_entry_id;

  return v_new_id;
end;
$function$;

create or replace function public.delete_attachment(p_attachment_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_path text;
  v_entry_id uuid;
  v_entry_date date;
  v_is_pro boolean := false;
  v_timezone text;
  v_today date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select coalesce(is_pro, false), timezone
    into v_is_pro, v_timezone
  from public.profiles
  where id = v_user_id;

  select storage_path, entry_id, entry_date
    into v_path, v_entry_id, v_entry_date
  from public.gratitude_attachments
  where id = p_attachment_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Attachment not found' using errcode = 'P0002';
  end if;

  v_today := case
    when v_timezone is not null then (now() at time zone v_timezone)::date
    else current_date
  end;

  if not v_is_pro and v_entry_date <> v_today then
    raise exception 'PAST_ENTRY_REQUIRES_PRO'
      using errcode = 'P0001';
  end if;

  delete from public.gratitude_attachments
  where id = p_attachment_id
    and user_id = v_user_id;

  update public.gratitude_entries
  set updated_at = now()
  where id = v_entry_id;

  return v_path;
end;
$function$;

create or replace function public.set_daily_gratitude_statements(
  p_entry_date date,
  p_statements jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean := false;
  v_timezone text;
  v_today date;
  v_count integer := coalesce(jsonb_array_length(coalesce(p_statements, '[]'::jsonb)), 0);
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select coalesce(is_pro, false), timezone
    into v_is_pro, v_timezone
  from public.profiles
  where id = v_user_id;

  v_today := case
    when v_timezone is not null then (now() at time zone v_timezone)::date
    else current_date
  end;

  if not v_is_pro and p_entry_date <> v_today then
    raise exception 'PAST_ENTRY_REQUIRES_PRO'
      using errcode = 'P0001';
  end if;

  if not v_is_pro and v_count > 1 then
    raise exception 'FREE_DAILY_LIMIT_REACHED'
      using errcode = 'P0001';
  end if;

  insert into public.gratitude_entries (user_id, entry_date, statements, created_at, updated_at)
  values (v_user_id, p_entry_date, coalesce(p_statements, '[]'::jsonb), now(), now())
  on conflict (user_id, entry_date)
  do update set
    statements = excluded.statements,
    updated_at = now();
end;
$function$;

grant execute on function public.add_gratitude_statement(date, text, text) to authenticated;
grant execute on function public.edit_gratitude_statement(date, integer, text, text) to authenticated;
grant execute on function public.delete_gratitude_statement(date, integer) to authenticated;
grant execute on function public.delete_gratitude_entry_by_date(date) to authenticated;
grant execute on function public.set_statement_mood(date, integer, text) to authenticated;
grant execute on function public.attach_media_to_statement(date, integer, text, text, text, integer, integer, integer, integer) to authenticated;
grant execute on function public.delete_attachment(uuid) to authenticated;
grant execute on function public.list_attachments_for_date(date) to authenticated;
grant execute on function public.set_daily_gratitude_statements(date, jsonb) to authenticated;
grant execute on function public.get_latest_mood_insight_snapshot(text, text) to authenticated;

-- Keep debug/admin/extension helpers out of the exposed API roles. Dynamic
-- grants avoid brittle overload signatures for http/urlencode helper variants.
do $$
declare
  v_fn regprocedure;
begin
  for v_fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'analyze_notification_query_performance',
        'cleanup_stale_tokens',
        'debug_hourly_notification_users',
        'debug_notification_matching',
        'debug_notification_users',
        'diagnose_cron_job_permissions',
        'get_basic_notification_stats',
        'get_users_for_next_hour_optimized',
        'get_users_to_notify',
        'update_cron_job',
        'bytea_to_text',
        'text_to_bytea',
        'urlencode',
        'http',
        'http_delete',
        'http_get',
        'http_head',
        'http_header',
        'http_list_curlopt',
        'http_patch',
        'http_post',
        'http_put',
        'http_reset_curlopt',
        'http_set_curlopt'
      ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', v_fn);
  end loop;

  for v_fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'cleanup_stale_tokens',
        'consume_ai_usage',
        'enqueue_notification_jobs',
        'insert_notification_logs',
        'lock_notification_jobs',
        'reset_stuck_notification_jobs'
      ])
  loop
    execute format('grant execute on function %s to service_role', v_fn);
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
