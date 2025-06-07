-- SAFE streak function testing script
-- This script is designed to run safely against your production database
-- It uses transactions, temporary data, and careful cleanup

-- Check if required function exists before running tests
DO $$
BEGIN
  -- Check if calculate_streak function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'calculate_streak'
  ) THEN
    RAISE EXCEPTION 'ERROR: calculate_streak function does not exist. Please run scripts/create-calculate-streak-function.sql first.';
  END IF;
  
  -- Check if gratitude_entries table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gratitude_entries'
  ) THEN
    RAISE EXCEPTION 'ERROR: gratitude_entries table does not exist.';
  END IF;
  
  RAISE NOTICE 'Database checks passed. Starting tests...';
END;
$$;

-- Wrap everything in a transaction that will be rolled back
BEGIN;

-- Create a dedicated test user ID that we can safely clean up
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  result INTEGER;
  test_count INTEGER := 0;
  pass_count INTEGER := 0;
BEGIN
  -- Create a temporary test user (will be rolled back)
  INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
  VALUES (
    test_user_id, 
    'test-streak@example.com', 
    NOW(), 
    NOW(), 
    NOW()
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Also insert into public.users if it exists (some setups have this)
  BEGIN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (
      test_user_id, 
      'test-streak@example.com', 
      NOW(), 
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    -- public.users table doesn't exist, that's fine
    NULL;
  END;
  
  -- Ensure no existing test data
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Starting streak function tests with test user: %', test_user_id;
  RAISE NOTICE '============================================';
  
  -- Test 1: Empty user (no entries)
  RAISE NOTICE 'Test 1: Empty user (no entries)';
  test_count := test_count + 1;
  
  SELECT calculate_streak(test_user_id) INTO result;
  IF result = 0 THEN
    RAISE NOTICE '✅ PASS: Empty user returns 0 streak';
    pass_count := pass_count + 1;
  ELSE
    RAISE NOTICE '❌ FAIL: Empty user should return 0, got %', result;
  END IF;
  
  -- Test 2: Single entry today
  RAISE NOTICE 'Test 2: Single entry today';
  test_count := test_count + 1;
  
  INSERT INTO gratitude_entries (user_id, entry_date, statements)
  VALUES (test_user_id, CURRENT_DATE, jsonb_build_array('Test statement'));
  
  SELECT calculate_streak(test_user_id) INTO result;
  IF result = 1 THEN
    RAISE NOTICE '✅ PASS: Single entry today returns 1 streak';
    pass_count := pass_count + 1;
  ELSE
    RAISE NOTICE '❌ FAIL: Single entry should return 1, got %', result;
  END IF;
  
  -- Test 3: Consecutive entries (3 days to be conservative)
  RAISE NOTICE 'Test 3: Consecutive entries (3 days)';
  test_count := test_count + 1;
  
  INSERT INTO gratitude_entries (user_id, entry_date, statements) VALUES
    (test_user_id, CURRENT_DATE - 1, jsonb_build_array('Yesterday')),
    (test_user_id, CURRENT_DATE - 2, jsonb_build_array('Day before'));
  
  SELECT calculate_streak(test_user_id) INTO result;
  IF result = 3 THEN
    RAISE NOTICE '✅ PASS: Three consecutive entries return 3 streak';
    pass_count := pass_count + 1;
  ELSE
    RAISE NOTICE '❌ FAIL: Three consecutive entries should return 3, got %', result;
  END IF;
  
  -- Test 4: Gap in entries
  RAISE NOTICE 'Test 4: Gap in entries';
  test_count := test_count + 1;
  
  DELETE FROM gratitude_entries WHERE user_id = test_user_id AND entry_date = CURRENT_DATE - 1;
  
  SELECT calculate_streak(test_user_id) INTO result;
  IF result = 1 THEN
    RAISE NOTICE '✅ PASS: Gap breaks streak correctly (got %)', result;
    pass_count := pass_count + 1;
  ELSE
    RAISE NOTICE '❌ FAIL: Gap should break streak to 1, got %', result;
  END IF;
  
  -- Test 5: Empty statements array
  RAISE NOTICE 'Test 5: Empty statements array';
  test_count := test_count + 1;
  
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  INSERT INTO gratitude_entries (user_id, entry_date, statements)
  VALUES (test_user_id, CURRENT_DATE, '[]'::jsonb);
  
  SELECT calculate_streak(test_user_id) INTO result;
  IF result = 0 THEN
    RAISE NOTICE '✅ PASS: Empty statements array returns 0 streak';
    pass_count := pass_count + 1;
  ELSE
    RAISE NOTICE '❌ FAIL: Empty statements should return 0, got %', result;
  END IF;
  
  -- Test 6: Grace period (no entry today, but entry yesterday)
  RAISE NOTICE 'Test 6: Grace period test';
  test_count := test_count + 1;
  
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  INSERT INTO gratitude_entries (user_id, entry_date, statements)
  VALUES (test_user_id, CURRENT_DATE - 1, jsonb_build_array('Yesterday only'));
  
  SELECT calculate_streak(test_user_id) INTO result;
  IF result = 1 THEN
    RAISE NOTICE '✅ PASS: Grace period works - yesterday entry gives 1 streak';
    pass_count := pass_count + 1;
  ELSE
    RAISE NOTICE '❌ FAIL: Grace period should give 1 for yesterday entry, got %', result;
  END IF;
  
  -- Test 7: NULL user_id (error handling)
  RAISE NOTICE 'Test 7: NULL user_id handling';
  test_count := test_count + 1;
  
  BEGIN
    SELECT calculate_streak(NULL) INTO result;
    RAISE NOTICE '❌ FAIL: NULL user_id should raise exception';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ PASS: NULL user_id correctly raises exception';
    pass_count := pass_count + 1;
  END;
  
  -- Test 8: Future date entry (should be ignored)
  RAISE NOTICE 'Test 8: Future date entry';
  test_count := test_count + 1;
  
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  INSERT INTO gratitude_entries (user_id, entry_date, statements)
  VALUES (test_user_id, CURRENT_DATE + 1, jsonb_build_array('Future entry'));
  
  SELECT calculate_streak(test_user_id) INTO result;
  IF result = 0 THEN
    RAISE NOTICE '✅ PASS: Future entries are ignored (streak = 0)';
    pass_count := pass_count + 1;
  ELSE
    RAISE NOTICE '❌ FAIL: Future entries should be ignored, got %', result;
  END IF;
  
  -- Final cleanup of test data
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  -- Test summary
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Test Summary: %/% tests passed', pass_count, test_count;
  
  IF pass_count = test_count THEN
    RAISE NOTICE '🎉 ALL TESTS PASSED! Streak function is working correctly.';
  ELSE
    RAISE NOTICE '⚠️  Some tests failed. Review the results above.';
  END IF;
  
END;
$$;

-- Performance test (limited to 100 entries for safety)
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTERVAL;
  result INTEGER;
BEGIN
  -- Create a temporary test user for performance test (will be rolled back)
  INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
  VALUES (
    test_user_id, 
    'test-performance@example.com', 
    NOW(), 
    NOW(), 
    NOW()
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Also insert into public.users if it exists
  BEGIN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (
      test_user_id, 
      'test-performance@example.com', 
      NOW(), 
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    -- public.users table doesn't exist, that's fine
    NULL;
  END;
  
  RAISE NOTICE 'Performance Test: 100 consecutive entries';
  
  start_time := clock_timestamp();
  
  -- Insert 100 consecutive entries (much safer than 1000)
  FOR i IN 0..99 LOOP
    INSERT INTO gratitude_entries (user_id, entry_date, statements)
    VALUES (test_user_id, CURRENT_DATE - i, jsonb_build_array('Performance test ' || i));
  END LOOP;
  
  SELECT calculate_streak(test_user_id) INTO result;
  
  end_time := clock_timestamp();
  duration := end_time - start_time;
  
  RAISE NOTICE 'Performance: % entries processed in %', result, duration;
  
  -- Cleanup
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  IF result = 100 THEN
    RAISE NOTICE '✅ Performance test passed';
  ELSE
    RAISE NOTICE '❌ Performance test failed: expected 100, got %', result;
  END IF;
END;
$$;

-- Rollback all changes to ensure no test data remains
ROLLBACK;

-- Final completion message
DO $$
BEGIN
  RAISE NOTICE '🔒 All test data has been rolled back. Database is unchanged.';
  RAISE NOTICE 'Tests completed safely!';
END;
$$; 