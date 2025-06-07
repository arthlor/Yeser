-- Create the missing calculate_streak function
-- This function is called by the streakApi.ts and should return just an integer

CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_check_date DATE;
  v_has_entry BOOLEAN;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- Calculate current streak (from today backwards)
  v_check_date := CURRENT_DATE;
  
  LOOP
    -- Check if user has an entry for this date
    SELECT EXISTS(
      SELECT 1 FROM gratitude_entries 
      WHERE user_id = p_user_id 
      AND entry_date = v_check_date
      AND jsonb_array_length(statements) > 0
    ) INTO v_has_entry;
    
    -- If no entry found
    IF NOT v_has_entry THEN
      -- Grace period: If this is today and current streak is 0, check yesterday
      IF v_check_date = CURRENT_DATE AND v_current_streak = 0 THEN
        v_check_date := v_check_date - INTERVAL '1 day';
        CONTINUE;
      END IF;
      
      -- No more grace - break the streak
      EXIT;
    END IF;
    
    -- Increment current streak and check previous day
    v_current_streak := v_current_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
    
    -- Safety limit to prevent infinite loops
    IF v_current_streak >= 1000 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_current_streak;
END;
$$;

-- Test the function (replace with actual user ID for testing)
-- SELECT calculate_streak('your-user-id-here'); 