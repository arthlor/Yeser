-- Notification delivery diagnostics.
-- Run in the Supabase SQL editor. This intentionally reports secret presence
-- and token suffixes only; it does not print full Vault secrets or push tokens.

-- 1. Confirm only the expected cron jobs are active, and inspect stale callers.
-- `process-notification-jobs` is deprecated. It may still exist as a deployed
-- Edge Function for historical compatibility, but it must not be scheduled or
-- called by cron; the supported worker path is send-daily-reminders plus
-- check-push-receipts.
select
  jobid,
  jobname,
  schedule,
  active,
  case
    when jobname = 'check-push-receipts'
      or command ilike '%check-push-receipts%' then 'receipt-checker'
    when jobname = 'cleanup-storage-queue'
      or command ilike '%cleanup-storage-queue%' then 'storage-cleanup'
    when jobname = 'send-daily-reminders'
      or command ilike '%send-daily-reminders%' then 'sender'
    when jobname = 'enqueue-notification-jobs'
      or command ilike '%enqueue_notification_jobs%' then 'enqueue'
    when jobname = 'reset-stuck-notification-jobs'
      or command ilike '%reset_stuck_notification_jobs%' then 'reset'
    when jobname = 'refresh-notification-windows'
      or command ilike '%notification_windows%' then 'window-refresh'
    else 'other'
  end as notification_role,
  command
from cron.job
where jobname ilike '%notification%'
   or jobname in (
    'send-daily-reminders',
    'check-push-receipts',
    'cron-trigger',
    'process-notification-jobs'
  )
   or command ilike '%send-daily-reminders%'
   or command ilike '%check-push-receipts%'
   or command ilike '%process-notification-jobs%'
order by jobname, jobid;

-- 2. Inspect recent cron HTTP responses without exposing request headers.
select
  r.id,
  r.created,
  r.status_code,
  case
    when r.content ilike '%receipts_checked%' then 'check-push-receipts'
    when r.content ilike '%jobs_processed%' then 'send-daily-reminders'
    else 'other'
  end as worker,
  r.timed_out,
  r.error_msg,
  left(coalesce(r.content, ''), 500) as response_body
from net._http_response r
where r.created > now() - interval '24 hours'
  and r.content ilike any (array[
    '%jobs_processed%',
    '%receipts_checked%',
    '%credential_errors%',
    '%Expo%'
  ])
order by r.created desc
limit 100;

-- 3. Confirm required cron/Vault secrets exist without exposing values.
select
  name,
  decrypted_secret is not null as present,
  length(decrypted_secret) as value_length
from vault.decrypted_secrets
where name in (
  'cron_daily_reminders_url',
  'cron_service_role_key',
  'cron_internal_secret',
  'cron_auth_token'
)
order by name;

-- 4. Confirm receipt observability columns are live.
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notification_logs'
  and column_name in (
    'expo_ticket_id',
    'receipt_status',
    'receipt_message',
    'receipt_details',
    'receipt_checked_at'
  )
order by ordinal_position;

-- 5. Receipt backlog shape.
select
  count(*) filter (
    where expo_ticket_id is not null
      and receipt_checked_at is null
  ) as pending_receipts,
  min(delivered_at) filter (
    where expo_ticket_id is not null
      and receipt_checked_at is null
  ) as oldest_pending_receipt,
  max(delivered_at) filter (
    where expo_ticket_id is not null
      and receipt_checked_at is null
  ) as newest_pending_receipt,
  count(*) filter (
    where delivered_at > now() - interval '2 hours'
  ) as logs_last_2h
from public.notification_logs;

-- 6. Receipt status counts.
select
  coalesce(receipt_status, 'unchecked') as receipt_status,
  count(*) as count
from public.notification_logs
group by coalesce(receipt_status, 'unchecked')
order by count desc;

-- 7. Receipt failure categories. APNs InvalidProviderToken/InvalidCredentials
-- are provider credential failures; DeviceNotRegistered is stale-token cleanup.
select
  coalesce(nl.receipt_details ->> 'error', nl.receipt_status, 'unchecked')
    as receipt_error,
  nl.receipt_details ->> 'reason' as provider_reason,
  (nl.receipt_details ->> 'requires_credential_fix')::boolean
    as requires_credential_fix,
  count(*) as count,
  max(nl.delivered_at) as latest_delivered_at,
  max(nl.receipt_checked_at) as latest_receipt_checked_at
from public.notification_logs nl
where nl.delivered_at > now() - interval '7 days'
  and (
    nl.receipt_status is distinct from 'ok'
    or nl.receipt_checked_at is null
  )
group by
  coalesce(nl.receipt_details ->> 'error', nl.receipt_status, 'unchecked'),
  nl.receipt_details ->> 'reason',
  (nl.receipt_details ->> 'requires_credential_fix')::boolean
order by count desc, latest_receipt_checked_at desc nulls last;

-- 8. Provider credential failures only.
select
  nl.id,
  nl.job_id,
  right(nl.token, 12) as token_suffix,
  nl.receipt_status,
  nl.receipt_message,
  nl.receipt_details ->> 'error' as receipt_error,
  nl.receipt_details ->> 'reason' as provider_reason,
  (nl.receipt_details ->> 'requires_credential_fix')::boolean
    as requires_credential_fix,
  nl.delivered_at,
  nl.receipt_checked_at
from public.notification_logs nl
where nl.receipt_status = 'error'
  and coalesce(nl.receipt_details ->> 'error', '') <> 'DeviceNotRegistered'
  and (
    (
      (nl.receipt_details ->> 'requires_credential_fix')::boolean is true
      and nl.receipt_details ->> 'error' not in ('DeviceNotRegistered')
    )
    or nl.receipt_details ->> 'error' in (
      'InvalidCredentials',
      'InvalidProviderToken',
      'MismatchSenderId'
    )
    or nl.receipt_message ilike any (array[
      '%credential%',
      '%provider%'
    ])
  )
order by nl.receipt_checked_at desc nulls last, nl.delivered_at desc
limit 100;

-- 9. DeviceNotRegistered cleanup candidates.
select
  nl.id,
  nl.job_id,
  right(nl.token, 12) as token_suffix,
  nl.receipt_message,
  nl.delivered_at,
  nl.receipt_checked_at,
  pt.token is null as token_already_removed
from public.notification_logs nl
left join public.push_tokens pt on pt.token = nl.token
where nl.receipt_details ->> 'error' = 'DeviceNotRegistered'
order by nl.receipt_checked_at desc nulls last, nl.delivered_at desc
limit 100;

-- 10. Jobs whose receipt terminal state and job status disagree.
with receipt_rollup as (
  select
    nl.job_id,
    count(*) filter (where nl.expo_ticket_id is not null) as receipt_ticket_count,
    count(*) filter (
      where nl.expo_ticket_id is not null
        and nl.receipt_checked_at is null
    ) as unchecked_receipts,
    count(*) filter (where nl.receipt_status = 'ok') as ok_receipts,
    count(*) filter (
      where nl.expo_ticket_id is not null
        and nl.receipt_checked_at is not null
        and nl.receipt_status is distinct from 'ok'
    ) as failed_receipts
  from public.notification_logs nl
  where nl.job_id is not null
  group by nl.job_id
)
select
  nj.id,
  nj.user_id,
  nj.scheduled_for,
  nj.status,
  nj.last_error,
  rr.receipt_ticket_count,
  rr.unchecked_receipts,
  rr.ok_receipts,
  rr.failed_receipts
from receipt_rollup rr
join public.notification_jobs nj on nj.id = rr.job_id
where rr.receipt_ticket_count > 0
  and rr.unchecked_receipts = 0
  and (
    (rr.ok_receipts = 0 and rr.failed_receipts > 0 and nj.status <> 'failed')
    or (rr.ok_receipts > 0 and rr.failed_receipts > 0 and nj.status <> 'sent')
  )
order by nj.scheduled_for desc
limit 100;

-- 11. Recent sender tickets and receipts. Match token_suffix with the suffix
-- shown by your installed app's Expo push token.
select
  nl.id,
  nl.job_id,
  right(nl.token, 12) as token_suffix,
  nl.expo_status,
  nl.expo_ticket_id is not null as has_ticket_id,
  nl.receipt_status,
  nl.receipt_message,
  nl.receipt_details,
  nl.delivered_at,
  nl.receipt_checked_at
from public.notification_logs nl
order by nl.delivered_at desc
limit 100;

-- 12. Current push tokens by user, without exposing full tokens.
select
  pt.user_id,
  p.notification_time,
  p.timezone,
  p.language,
  right(pt.token, 12) as token_suffix,
  pt.token_type,
  pt.created_at
from public.push_tokens pt
join public.profiles p on p.id = pt.user_id
order by pt.created_at desc
limit 100;

-- 13. Recent jobs and whether they have logs.
select
  nj.id,
  nj.user_id,
  nj.scheduled_for,
  nj.status,
  nj.attempts,
  nj.last_error,
  jsonb_array_length(to_jsonb(nj.tokens)) as token_count,
  count(nl.id) as log_count,
  max(nl.delivered_at) as latest_log_at
from public.notification_jobs nj
left join public.notification_logs nl on nl.job_id = nj.id
where nj.created_at > now() - interval '24 hours'
group by nj.id
order by nj.created_at desc
limit 100;

-- 14. Historical duplicate job windows.
-- Rows here can remain after the dedupe migration because old `sent` jobs are
-- delivery history. This query is evidence of the old bug, not by itself proof
-- that the bug is still active.
select
  user_id,
  scheduled_for,
  count(*) as job_count,
  min(created_at) as first_job_created_at,
  max(created_at) as last_job_created_at,
  array_agg(status order by created_at asc) as statuses,
  array_agg(id order by created_at asc) as job_ids
from public.notification_jobs
where created_at > now() - interval '7 days'
group by user_id, scheduled_for
having count(*) > 1
order by scheduled_for desc, job_count desc
limit 100;

-- 15. Current duplicate-regression check.
-- After applying 20260521181849_notification_job_dedupe.sql, this should return
-- zero rows for new enqueue windows. Adjust the timestamp to the time you ran
-- the dedupe migration if you want an exact post-fix check.
select
  user_id,
  scheduled_for,
  count(*) as job_count,
  min(created_at) as first_job_created_at,
  max(created_at) as last_job_created_at,
  array_agg(status order by created_at asc) as statuses,
  array_agg(id order by created_at asc) as job_ids
from public.notification_jobs
where created_at > now() - interval '2 hours'
group by user_id, scheduled_for
having count(*) > 1
order by scheduled_for desc, job_count desc
limit 100;

-- 16. Confirm the live enqueue function is the deduped version.
-- `has_advisory_lock` and `has_profile_tokens_preaggregation` should be true.
-- `still_only_skips_active_jobs` should be false; if it is true, the old
-- function body is still deployed in the DB.
select
  p.proname as function_name,
  position('pg_advisory_xact_lock' in pg_get_functiondef(p.oid)) > 0 as has_advisory_lock,
  position('with profile_tokens as' in lower(pg_get_functiondef(p.oid))) > 0
    as has_profile_tokens_preaggregation,
  position('nj.status in' in pg_get_functiondef(p.oid)) > 0 as still_only_skips_active_jobs,
  position('and nj.scheduled_for = v_target_time' in pg_get_functiondef(p.oid)) > 0
    as checks_exact_target_window
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'enqueue_notification_jobs';

-- 17. Confirm the hard insert guard is installed.
select
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'notification_jobs'
  and trigger_name = 'notification_jobs_suppress_duplicate';

-- 18. Confirm the active-job unique index exists as a second line of defense.
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'notification_jobs'
  and indexname = 'notification_jobs_active_user_window_uidx';

-- 19. Confirm notification RPC grants.
select
  function_name,
  anon_execute,
  authenticated_execute,
  service_role_execute
from (
  values
    (
      'enqueue_notification_jobs(integer)',
      has_function_privilege('anon', 'public.enqueue_notification_jobs(integer)', 'execute'),
      has_function_privilege('authenticated', 'public.enqueue_notification_jobs(integer)', 'execute'),
      has_function_privilege('service_role', 'public.enqueue_notification_jobs(integer)', 'execute')
    ),
    (
      'lock_notification_jobs(integer, timestamp with time zone)',
      has_function_privilege('anon', 'public.lock_notification_jobs(integer, timestamp with time zone)', 'execute'),
      has_function_privilege('authenticated', 'public.lock_notification_jobs(integer, timestamp with time zone)', 'execute'),
      has_function_privilege('service_role', 'public.lock_notification_jobs(integer, timestamp with time zone)', 'execute')
    ),
    (
      'reset_stuck_notification_jobs(interval)',
      has_function_privilege('anon', 'public.reset_stuck_notification_jobs(interval)', 'execute'),
      has_function_privilege('authenticated', 'public.reset_stuck_notification_jobs(interval)', 'execute'),
      has_function_privilege('service_role', 'public.reset_stuck_notification_jobs(interval)', 'execute')
    ),
    (
      'insert_notification_logs(jsonb)',
      has_function_privilege('anon', 'public.insert_notification_logs(jsonb)', 'execute'),
      has_function_privilege('authenticated', 'public.insert_notification_logs(jsonb)', 'execute'),
      has_function_privilege('service_role', 'public.insert_notification_logs(jsonb)', 'execute')
    ),
    (
      'register_push_token(text, text, text)',
      has_function_privilege('anon', 'public.register_push_token(text, text, text)', 'execute'),
      has_function_privilege('authenticated', 'public.register_push_token(text, text, text)', 'execute'),
      has_function_privilege('service_role', 'public.register_push_token(text, text, text)', 'execute')
    ),
    (
      'unregister_push_token(text)',
      has_function_privilege('anon', 'public.unregister_push_token(text)', 'execute'),
      has_function_privilege('authenticated', 'public.unregister_push_token(text)', 'execute'),
      has_function_privilege('service_role', 'public.unregister_push_token(text)', 'execute')
    ),
    (
      'set_notifications_enabled(boolean)',
      has_function_privilege('anon', 'public.set_notifications_enabled(boolean)', 'execute'),
      has_function_privilege('authenticated', 'public.set_notifications_enabled(boolean)', 'execute'),
      has_function_privilege('service_role', 'public.set_notifications_enabled(boolean)', 'execute')
    )
) as grants(function_name, anon_execute, authenticated_execute, service_role_execute)
order by function_name;

-- 20. Recent credential repair acceptance check.
-- After rotating EAS/APNs credentials, this should show new ok receipts and no
-- new InvalidProviderToken/InvalidCredentials rows after the repair timestamp.
select
  date_trunc('hour', nl.receipt_checked_at) as receipt_checked_hour,
  nl.receipt_details ->> 'error' as receipt_error,
  nl.receipt_status,
  count(*) as receipt_count
from public.notification_logs nl
where nl.receipt_checked_at > now() - interval '24 hours'
  and (
    nl.receipt_status = 'ok'
    or nl.receipt_details ->> 'error' in (
      'InvalidCredentials',
      'InvalidProviderToken',
      'MismatchSenderId'
    )
  )
group by
  date_trunc('hour', nl.receipt_checked_at),
  nl.receipt_details ->> 'error',
  nl.receipt_status
order by receipt_checked_hour desc nulls last, receipt_count desc;

-- 21. Ticket acceptance versus receipt delivery.
-- Use this after credential repair to avoid mistaking Expo ticket acceptance
-- for APNs/FCM delivery. Healthy iOS delivery should show recent ticket_ok
-- followed by receipt_ok, with credential_receipt_errors staying at 0.
select
  date_trunc('hour', nl.delivered_at) as delivered_hour,
  count(*) filter (where nl.expo_status = 'ok') as ticket_ok,
  count(*) filter (where nl.expo_status is distinct from 'ok') as ticket_error,
  count(*) filter (where nl.receipt_status = 'ok') as receipt_ok,
  count(*) filter (
    where nl.receipt_details ->> 'error' in (
      'InvalidCredentials',
      'InvalidProviderToken',
      'MismatchSenderId'
    )
  ) as credential_receipt_errors,
  count(*) filter (
    where nl.expo_ticket_id is not null
      and nl.receipt_checked_at is null
  ) as pending_receipts
from public.notification_logs nl
where nl.delivered_at > now() - interval '24 hours'
group by date_trunc('hour', nl.delivered_at)
order by delivered_hour desc nulls last;
