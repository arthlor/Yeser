-- fix_01_rotate_cron_service_role.sql
--
-- Removes the hardcoded service_role JWT + internal secret from the
-- `cron-trigger` job and reads them from Supabase Vault at runtime instead.
-- Also fixes the `Bearer Bearer …` double-prefix bug that shipped in
-- supabase/migrations/manual_supabase_04_notification_cron_update.sql.
--
-- BEFORE RUNNING:
--   1. Rotate the service_role key if the previous one ever left the team.
--      (Supabase Dashboard -> Project Settings -> API -> "Rotate" service_role key)
--   2. Rotate EDGE_INTERNAL_SECRET and redeploy `send-daily-reminders`.
--   3. Store both secrets in Vault:
--        select vault.create_secret(
--          '<new service_role JWT>', 'cron_service_role_key',
--          'Service role JWT used by cron to call send-daily-reminders'
--        );
--        select vault.create_secret(
--          '<new internal secret>',  'cron_internal_secret',
--          'x-internal-secret header expected by send-daily-reminders'
--        );
--        select vault.create_secret(
--          'https://<project-ref>.functions.supabase.co/send-daily-reminders',
--          'cron_daily_reminders_url'
--        );
--
-- Replace the __SUPABASE_FUNCTION_URL__ placeholder below if you are not
-- storing it in Vault.

do $$
declare
  v_existing_jobid bigint;
begin
  select jobid into v_existing_jobid
  from cron.job
  where jobname = 'cron-trigger'
  limit 1;

  if v_existing_jobid is not null then
    perform cron.unschedule(v_existing_jobid);
  end if;

  perform cron.schedule(
    'cron-trigger',
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
where jobname = 'cron-trigger';
