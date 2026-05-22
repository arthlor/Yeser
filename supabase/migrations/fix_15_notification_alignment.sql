-- fix_15_notification_alignment.sql
--
-- 1. Drop onboarded gate from enqueue_notification_jobs (reminders can be enabled mid-onboarding)
-- 2. Per-device disable: keep notification_time when other devices still have tokens

begin;

create or replace function public.enqueue_notification_jobs(p_horizon_minutes integer default 5)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_target_time timestamptz := now() + make_interval(mins => p_horizon_minutes);
  inserted integer;
begin
  insert into public.notification_jobs (
    user_id,
    scheduled_for,
    tokens,
    language,
    metadata
  )
  select
    p.id,
    date_trunc('minute', v_target_time),
    array_agg(pt.token order by pt.created_at desc),
    coalesce(p.language, 'en'),
    jsonb_build_object(
      'variant',
      case
        when extract(hour from (v_target_time at time zone p.timezone)) < 17 then 'midday'
        else 'evening'
      end,
      'timezone',
      p.timezone,
      'notification_time',
      to_char(p.notification_time, 'HH24:MI'),
      'memory_statement',
      memory_pick.statement,
      'memory_entry_date',
      case
        when memory_pick.entry_date is null then null
        else to_char(memory_pick.entry_date, 'YYYY-MM-DD')
      end,
      'memory_age_days',
      memory_pick.age_days
    )
  from public.profiles p
  join public.push_tokens pt on p.id = pt.user_id
  left join lateral (
    select
      ge.entry_date,
      statement_pick.statement,
      ((v_target_time at time zone p.timezone)::date - ge.entry_date) as age_days
    from public.gratitude_entries ge
    join lateral (
      select statement_value.value as statement
      from jsonb_array_elements_text(ge.statements) as statement_value(value)
      order by random()
      limit 1
    ) as statement_pick on true
    where ge.user_id = p.id
      and jsonb_array_length(ge.statements) > 0
      and ge.entry_date <= ((v_target_time at time zone p.timezone)::date - 14)
    order by random()
    limit 1
  ) as memory_pick on true
  where p.notification_time is not null
    and p.timezone is not null
    and p.notification_time = (date_trunc('minute', v_target_time at time zone p.timezone))::time
    and not exists (
      select 1
      from public.notification_jobs nj
      where nj.user_id = p.id
        and nj.scheduled_for = date_trunc('minute', v_target_time)
        and nj.status in ('pending', 'processing')
    )
  group by
    p.id,
    p.language,
    p.timezone,
    p.notification_time,
    memory_pick.entry_date,
    memory_pick.statement,
    memory_pick.age_days;

  get diagnostics inserted = row_count;
  return inserted;
end;
$function$;

create or replace function public.set_notifications_enabled(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_default_time constant time := '12:30:00'::time;
begin
  if v_user_id is null then
    raise exception 'set_notifications_enabled: auth.uid() returned null';
  end if;

  update public.profiles
  set
    notification_time = case
      when p_enabled then coalesce(notification_time, v_default_time)
      when exists (
        select 1
        from public.push_tokens
        where user_id = v_user_id
      ) then notification_time
      else null
    end,
    updated_at = now()
  where id = v_user_id;
end;
$function$;

-- Keep monitoring matview consistent with enqueue eligibility.
drop materialized view if exists public.notification_windows;

create materialized view public.notification_windows as
with eligible_profiles as (
  select
    p.id,
    p.timezone,
    p.notification_time,
    p.language
  from public.profiles p
  where p.timezone is not null
    and p.notification_time is not null
),
profile_tokens as (
  select
    pt.user_id,
    array_agg(pt.token order by pt.created_at desc) as tokens
  from public.push_tokens pt
  group by pt.user_id
)
select
  ep.id as user_id,
  ep.timezone,
  ep.notification_time::text as notification_time,
  ep.language,
  date_trunc('minute', timezone(ep.timezone, now()))::text as local_now,
  date_trunc('minute', timezone(ep.timezone, now()) + interval '1 hour')::text as local_next_hour,
  case
    when extract(hour from timezone(ep.timezone, now())) < 17 then 'midday'
    else 'evening'
  end as variant,
  pt.tokens
from eligible_profiles ep
left join profile_tokens pt on pt.user_id = ep.id
where coalesce(array_length(pt.tokens, 1), 0) > 0;

create unique index if not exists idx_notification_windows_user_id
  on public.notification_windows (user_id);

create index if not exists idx_notification_windows_notification_time
  on public.notification_windows (notification_time);

alter materialized view public.notification_windows owner to postgres;

revoke all on public.notification_windows from anon, authenticated;
grant select on public.notification_windows to service_role;

refresh materialized view public.notification_windows;

notify pgrst, 'reload schema';

commit;
