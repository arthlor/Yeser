-- Migration: secure_is_pro_column_20251215.sql

-- 1. Create function to check if is_pro is being modified
CREATE OR REPLACE FUNCTION public.check_is_pro_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if is_pro is being changed (handling nulls)
  IF (OLD.is_pro IS DISTINCT FROM NEW.is_pro) THEN
    -- Allow if the role is 'service_role' (used by Edge Functions / Webhooks)
    -- We check the JWT claims to determine the role
    IF (auth.role() != 'service_role') THEN
       -- Additionally check if it's the specific webhook service sending the update if auth.role is ambiguous,
       -- but auth.role() = 'service_role' is the standard Supabase way.
       -- CAUTION: Client SDKs usually use 'authenticated' or 'anon'.
       
       RAISE EXCEPTION 'You are not authorized to directly update the is_pro subscription status. Please use the official subscription flow.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on profiles table
DROP TRIGGER IF EXISTS protect_is_pro_field ON public.profiles;

CREATE TRIGGER protect_is_pro_field
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_is_pro_update();
