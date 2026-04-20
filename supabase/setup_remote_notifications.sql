-- setup_remote_notifications.sql
-- 
-- This script properly configures your server-side "cron-trigger" job 
-- so that it correctly hits the "send-daily-reminders" edge function.
--
-- IMPORTANT:
-- 1. Notice the `url` uses your actual project ID (svnexpdbckqiexdjbaca)
-- 2. You MUST replace '<YOUR_SERVICE_ROLE_KEY>' and '<YOUR_INTERNAL_SECRET>' 
--    below with your actual keys from the Supabase Dashboard.
--    * YOUR_SERVICE_ROLE_KEY: Project Settings -> API -> service_role secret
--    * YOUR_INTERNAL_SECRET: The value of EDGE_INTERNAL_SECRET in your Edge Function secrets

DO $$
DECLARE
  v_existing_jobid bigint;
BEGIN
  -- 1. Remove the old, broken cron job to prevent memory leaks and duplicate triggers
  SELECT jobid INTO v_existing_jobid
  FROM cron.job
  WHERE jobname = 'cron-trigger'
  LIMIT 1;

  IF v_existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_jobid);
  END IF;

  -- 2. Schedule the new, robust job
  PERFORM cron.schedule(
    'cron-trigger',
    '*/5 * * * *',
    $cmd$
    SELECT
      net.http_post(
        url := 'https://svnexpdbckqiexdjbaca.supabase.co/functions/v1/process-notification-jobs',
        headers := jsonb_build_object(
          'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
          'x-internal-secret', '<YOUR_INTERNAL_SECRET>',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000
      );
    $cmd$
  );
END;
$$;

-- 3. Verify it was created successfully
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'cron-trigger';
