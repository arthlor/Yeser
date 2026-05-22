-- fix_01_rotate_cron_service_role.sql
--
-- Removes the hardcoded service_role JWT + internal secret from the
-- notification sender job and reads them from Supabase Vault at runtime instead.
-- Also fixes the `Bearer Bearer ...` double-prefix bug that shipped in
-- supabase/migrations/manual_supabase_04_notification_cron_update.sql.
--
-- BEFORE RUNNING:
--   1. Rotate the service_role key if the previous one ever left the team.
--      (Supabase Dashboard -> Project Settings -> API -> "Rotate" service_role key)
--   2. Rotate EDGE_INTERNAL_SECRET and redeploy `send-daily-reminders`.
--   3. Store the cron invocation values in Vault:
--        select vault.create_secret(
--          '<new service_role JWT>', 'cron_service_role_key',
--          'Service role JWT used by cron to call send-daily-reminders'
--        );
--        select vault.create_secret(
--          '<new internal secret>',  'cron_internal_secret',
--          'x-internal-secret header expected by send-daily-reminders'
--        );
--        select vault.create_secret(
--          'https://<project-ref>.supabase.co/functions/v1/send-daily-reminders',
--          'cron_daily_reminders_url'
--        );
--        select vault.create_secret(
--          '<CRON_AUTH_TOKEN>', 'cron_auth_token',
--          'Optional x-cron-token header expected by send-daily-reminders'
--        );
--
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
    $cmd$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets
                 where name = 'cron_daily_reminders_url' limit 1),
        headers := jsonb_build_object(
          'Authorization',
          'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                         where name = 'cron_service_role_key' limit 1),
          'x-internal-secret',
          (select decrypted_secret from vault.decrypted_secrets
            where name = 'cron_internal_secret' limit 1),
          'x-cron-token',
          coalesce((select decrypted_secret from vault.decrypted_secrets
                    where name = 'cron_auth_token' limit 1), ''),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000
      );
    $cmd$
  );
end;
$$;

select jobid, jobname, schedule
from cron.job
where jobname = 'send-daily-reminders';
