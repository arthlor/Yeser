-- =============================================================================
-- Remote notification cron setup
-- =============================================================================
--
-- Run this from the Supabase SQL editor after the notification migrations are
-- applied. It schedules the complete notification pipeline:
--   1. refresh-notification-windows
--   2. enqueue-notification-jobs
--   3. reset-stuck-notification-jobs
--   4. send-daily-reminders
--   5. check-push-receipts
--   6. cleanup-storage-queue
--
-- Required Vault secrets:
--   cron_daily_reminders_url = https://<project-ref>.supabase.co/functions/v1/send-daily-reminders
--   cron_service_role_key    = rotated service_role JWT
--   cron_internal_secret     = EDGE_INTERNAL_SECRET used by send-daily-reminders
--   cron_auth_token          = optional CRON_AUTH_TOKEN, if enabled
--
-- The check-push-receipts and cleanup-storage-queue URLs are derived from
-- cron_daily_reminders_url.
--
-- Deprecated: process-notification-jobs was the old worker path. This setup
-- unschedules it if present; do not call or reschedule that Edge Function.
--
-- Example:
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/send-daily-reminders',
--     'cron_daily_reminders_url'
--   );
--   select vault.create_secret('<service-role-jwt>', 'cron_service_role_key');
--   select vault.create_secret('<edge-internal-secret>', 'cron_internal_secret');
--   select vault.create_secret('<optional-cron-token>', 'cron_auth_token');

begin;

do $$
declare
  v_job record;
begin
  for v_job in
    select jobid, jobname
    from cron.job
    where jobname in (
      'cron-trigger',
      'process-notification-jobs',
      'refresh-notification-windows',
      'enqueue-notification-jobs',
      'reset-stuck-notification-jobs',
      'send-daily-reminders',
      'check-push-receipts',
      'cleanup-storage-queue'
    )
    or command ilike '%process-notification-jobs%'
    or command ilike '%refresh materialized view%notification_windows%'
    or command ilike '%enqueue_notification_jobs%'
    or command ilike '%reset_stuck_notification_jobs%'
    or command ilike '%send-daily-reminders%'
    or command ilike '%check-push-receipts%'
    or command ilike '%cleanup-storage-queue%'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  perform cron.schedule(
    'refresh-notification-windows',
    '*/5 * * * *',
    $cmd$
    refresh materialized view concurrently public.notification_windows;
    $cmd$
  );

  perform cron.schedule(
    'enqueue-notification-jobs',
    '25,55 * * * *',
    $cmd$
    select public.enqueue_notification_jobs(5);
    $cmd$
  );

  perform cron.schedule(
    'reset-stuck-notification-jobs',
    '*/10 * * * *',
    $cmd$
    select public.reset_stuck_notification_jobs();
    $cmd$
  );

  perform cron.schedule(
    'send-daily-reminders',
    '*/5 * * * *',
    $cmd$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_daily_reminders_url'
        limit 1
      ),
      headers := jsonb_build_object(
        'apikey',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_service_role_key'
          limit 1
        ),
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_service_role_key'
          limit 1
        ),
        'x-internal-secret',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_internal_secret'
          limit 1
        ),
        'x-cron-token',
        coalesce((
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_auth_token'
          limit 1
        ), ''),
        'Content-Type',
        'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
    $cmd$
  );

  perform cron.schedule(
    'check-push-receipts',
    '*/5 * * * *',
    $cmd$
    select net.http_post(
      url := replace((
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_daily_reminders_url'
        limit 1
      ), '/send-daily-reminders', '/check-push-receipts'),
      headers := jsonb_build_object(
        'apikey',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_service_role_key'
          limit 1
        ),
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_service_role_key'
          limit 1
        ),
        'x-internal-secret',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_internal_secret'
          limit 1
        ),
        'x-cron-token',
        coalesce((
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_auth_token'
          limit 1
        ), ''),
        'Content-Type',
        'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
    $cmd$
  );

  perform cron.schedule(
    'cleanup-storage-queue',
    '17 * * * *',
    $cmd$
    select net.http_post(
      url := replace((
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_daily_reminders_url'
        limit 1
      ), '/send-daily-reminders', '/cleanup-storage-queue'),
      headers := jsonb_build_object(
        'apikey',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_service_role_key'
          limit 1
        ),
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_service_role_key'
          limit 1
        ),
        'x-internal-secret',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_internal_secret'
          limit 1
        ),
        'Content-Type',
        'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
    $cmd$
  );
end;
$$;

commit;

select jobid, jobname, schedule, active
from cron.job
where jobname in (
  'refresh-notification-windows',
  'enqueue-notification-jobs',
  'reset-stuck-notification-jobs',
  'send-daily-reminders',
  'check-push-receipts',
  'cleanup-storage-queue'
)
order by jobname;
