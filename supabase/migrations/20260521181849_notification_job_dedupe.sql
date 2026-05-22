-- Prevent duplicate notification jobs for the same user/time window.
--
-- Root cause: enqueue_notification_jobs only skipped existing pending/processing
-- jobs. If the sender marked one duplicate as sent before another enqueue call
-- ran for the same target minute, another job could be created and sent.

begin;

with ranked_active_jobs as (
  select
    id,
    row_number() over (
      partition by user_id, scheduled_for
      order by created_at asc, id asc
    ) as row_number
  from public.notification_jobs
  where status in ('pending', 'processing')
)
update public.notification_jobs nj
set
  status = 'failed',
  last_error = coalesce(
    nj.last_error,
    'Duplicate active notification job suppressed before dedupe index'
  ),
  updated_at = now()
from ranked_active_jobs ranked
where nj.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists notification_jobs_active_user_window_uidx
  on public.notification_jobs (user_id, scheduled_for)
  where status in ('pending', 'processing');

create or replace function public.enqueue_notification_jobs(p_horizon_minutes integer default 5)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_target_time timestamptz := date_trunc(
    'minute',
    now() + make_interval(mins => p_horizon_minutes)
  );
  inserted integer;
begin
  -- Serialize by target minute so concurrent/manual cron invocations cannot race
  -- between the NOT EXISTS check and the insert.
  perform pg_advisory_xact_lock(
    hashtext('enqueue_notification_jobs'),
    hashtext(v_target_time::text)
  );

  insert into public.notification_jobs (
    user_id,
    scheduled_for,
    tokens,
    language,
    metadata
  )
  select
    p.id,
    v_target_time,
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
    and p.notification_time = (v_target_time at time zone p.timezone)::time
    and not exists (
      select 1
      from public.notification_jobs nj
      where nj.user_id = p.id
        and nj.scheduled_for = v_target_time
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

notify pgrst, 'reload schema';

commit;
