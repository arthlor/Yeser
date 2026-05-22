-- manual_supabase_04_notification_cron_update.sql
--
-- Historical manual fix for the remote notification sender cron.
-- Safe version: no service_role JWTs or internal secrets are embedded here.
--
-- Prefer running supabase/setup_remote_notifications.sql, which contains the
-- current documented setup and verification query. This file is kept as a
-- migration-folder handoff for teams that apply fixes from /supabase/migrations.

do $$
declare
  v_job record;
begin
  for v_job in
    select jobid, jobname
    from cron.job
    where jobname in ('cron-trigger', 'process-notification-jobs', 'send-daily-reminders')
       or command ilike '%process-notification-jobs%'
       or command ilike '%send-daily-reminders%'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  perform cron.schedule(
    'send-daily-reminders',
    '*/5 * * * *',
    $command$
    select
      net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_daily_reminders_url'
          limit 1
        ),
        headers := jsonb_build_object(
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
          coalesce(
            (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'cron_auth_token'
              limit 1
            ),
            ''
          ),
          'Content-Type',
          'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000
      );
    $command$
  );
end;
$$;

select jobid, jobname, schedule, active
from cron.job
where jobname = 'send-daily-reminders';
