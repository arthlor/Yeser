-- Migration to remove insecure notification triggers containing hardcoded secrets
-- These functions are replaced by the secure Edge Function 'send-daily-reminders'

DROP FUNCTION IF EXISTS public.trigger_daily_reminders_fixed();
DROP FUNCTION IF EXISTS public.trigger_hourly_reminders();
