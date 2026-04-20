-- Replace every __PLACEHOLDER__ value before running this.
-- Recommended manual prep:
-- 1. Rotate the leaked service-role key if the old key was ever exposed outside your team.
-- 2. Generate a fresh EDGE_INTERNAL_SECRET for the send-daily-reminders function.
-- 3. Set a fresh CRON_AUTH_TOKEN secret on the send-daily-reminders function.
-- 4. Redeploy the send-daily-reminders edge function after updating those secrets.

DO $$
DECLARE
  v_existing_jobid bigint;
BEGIN
  SELECT jobid
    INTO v_existing_jobid
  FROM cron.job
  WHERE jobname = 'cron-trigger'
  LIMIT 1;

  IF v_existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_jobid);
  END IF;

  PERFORM cron.schedule(
    'cron-trigger',
    '*/5 * * * *',
    $command$
    SELECT
      net.http_post(
        url := '__SUPABASE_FUNCTION_URL__/send-daily-reminders',
        headers := jsonb_build_object(
          'Authorization', 'Bearer Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2bmV4cGRiY2txaWV4ZGpiYWNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODcwNjE1OCwiZXhwIjoyMDY0MjgyMTU4fQ.T85wVXnHsKAC0c5PoeTrq7jrild2Qtlc1jAzqyhV67A',
          'x-internal-secret', 'Rl4dlMORBKOh4bREXzTuZhXEyxhmsVjqfHO4txpj68A='
        ),
        body := '{}',
        timeout_milliseconds := 1000
      );
    $command$
  );
END;
$$;

SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'cron-trigger';
