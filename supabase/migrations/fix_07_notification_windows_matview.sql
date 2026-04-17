-- fix_07_notification_windows_matview.sql
--
-- Creates (or recreates) the public.notification_windows materialized view
-- that `refresh-notification-windows` cron refreshes every 5 minutes and that
-- supabase.types.ts references. It was present in production but missing from
-- /database/database.sql + migrations, so a fresh `supabase db reset` would
-- not reproduce it.
--
-- Columns match the typed definition already shipped in
-- src/types/supabase.types.ts (notification_windows).

begin;

drop materialized view if exists public.notification_windows;

create materialized view public.notification_windows as
with eligible_profiles as (
  select
    p.id,
    p.timezone,
    p.notification_time,
    p.language
  from public.profiles p
  where p.onboarded = true
    and p.timezone is not null
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

-- A unique index is required to allow `refresh materialized view concurrently`.
create unique index if not exists idx_notification_windows_user_id
  on public.notification_windows (user_id);

-- Secondary index used by the scheduler.
create index if not exists idx_notification_windows_notification_time
  on public.notification_windows (notification_time);

alter materialized view public.notification_windows owner to postgres;

revoke all on public.notification_windows from anon, authenticated;
grant select on public.notification_windows to service_role;

-- Warm the view so the first cron tick doesn't fail.
refresh materialized view public.notification_windows;

notify pgrst, 'reload schema';

commit;
