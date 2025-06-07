-- Comprehensive test script for streak calculation functions
-- Run this against your database to verify the streak logic works correctly

-- First, create some test data
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_date DATE;
BEGIN
  RAISE NOTICE 'Testing streak functions with user ID: %', test_user_id;
  
  -- Test Case 1: Empty user (no entries)
  RAISE NOTICE '=== Test Case 1: User with no entries ===';
  
  PERFORM test_calculate_streak_empty_user(test_user_id);
  
  -- Test Case 2: Single entry today
  RAISE NOTICE '=== Test Case 2: Single entry today ===';
  
  INSERT INTO gratitude_entries (user_id, entry_date, statements)
  VALUES (test_user_id, CURRENT_DATE, jsonb_build_array('Test gratitude statement'));
  
  PERFORM test_calculate_streak_single_entry(test_user_id);
  
  -- Test Case 3: Consecutive entries (5 days)
  RAISE NOTICE '=== Test Case 3: Consecutive entries (5 days) ===';
  
  -- Add entries for yesterday, day before, etc.
  FOR i IN 1..4 LOOP
    INSERT INTO gratitude_entries (user_id, entry_date, statements)
    VALUES (test_user_id, CURRENT_DATE - i, jsonb_build_array('Test statement ' || i));
  END LOOP;
  
  PERFORM test_calculate_streak_consecutive(test_user_id);
  
  -- Test Case 4: Gap in entries (missing day 3)
  RAISE NOTICE '=== Test Case 4: Gap in entries ===';
  
  -- Delete the entry from 3 days ago to create a gap
  DELETE FROM gratitude_entries 
  WHERE user_id = test_user_id 
  AND entry_date = CURRENT_DATE - 3;
  
  PERFORM test_calculate_streak_with_gap(test_user_id);
  
  -- Test Case 5: Empty statements array
  RAISE NOTICE '=== Test Case 5: Entry with empty statements ===';
  
  -- Clean up and add entry with empty statements
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  INSERT INTO gratitude_entries (user_id, entry_date, statements)
  VALUES (test_user_id, CURRENT_DATE, '[]'::jsonb);
  
  PERFORM test_calculate_streak_empty_statements(test_user_id);
  
  -- Test Case 6: Grace period test (no entry today, but entry yesterday)
  RAISE NOTICE '=== Test Case 6: Grace period test ===';
  
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  -- Add entry only for yesterday
  INSERT INTO gratitude_entries (user_id, entry_date, statements)
  VALUES (test_user_id, CURRENT_DATE - 1, jsonb_build_array('Yesterday statement'));
  
  PERFORM test_calculate_streak_grace_period(test_user_id);
  
  -- Test Case 7: Long streak (30 days)
  RAISE NOTICE '=== Test Case 7: Long streak (30 days) ===';
  
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  -- Add 30 consecutive entries
  FOR i IN 0..29 LOOP
    INSERT INTO gratitude_entries (user_id, entry_date, statements)
    VALUES (test_user_id, CURRENT_DATE - i, jsonb_build_array('Day ' || (30-i) || ' statement'));
  END LOOP;
  
  PERFORM test_calculate_streak_long(test_user_id);
  
  -- Test Case 8: Complex scenario with multiple gaps
  RAISE NOTICE '=== Test Case 8: Complex scenario with gaps ===';
  
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  -- Create a complex pattern: 3 days, gap, 2 days, gap, 4 days (current streak should be 4)
  -- Current streak: today, yesterday, 2 days ago, 3 days ago
  INSERT INTO gratitude_entries (user_id, entry_date, statements) VALUES
    (test_user_id, CURRENT_DATE, jsonb_build_array('Today')),
    (test_user_id, CURRENT_DATE - 1, jsonb_build_array('Yesterday')),
    (test_user_id, CURRENT_DATE - 2, jsonb_build_array('2 days ago')),
    (test_user_id, CURRENT_DATE - 3, jsonb_build_array('3 days ago'));
    -- Gap at CURRENT_DATE - 4
    
  INSERT INTO gratitude_entries (user_id, entry_date, statements) VALUES
    (test_user_id, CURRENT_DATE - 5, jsonb_build_array('5 days ago')),
    (test_user_id, CURRENT_DATE - 6, jsonb_build_array('6 days ago'));
    -- Gap at CURRENT_DATE - 7
    
  INSERT INTO gratitude_entries (user_id, entry_date, statements) VALUES
    (test_user_id, CURRENT_DATE - 8, jsonb_build_array('8 days ago')),
    (test_user_id, CURRENT_DATE - 9, jsonb_build_array('9 days ago')),
    (test_user_id, CURRENT_DATE - 10, jsonb_build_array('10 days ago'));
  
  PERFORM test_calculate_streak_complex(test_user_id);
  
  -- Cleanup
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  RAISE NOTICE '=== All tests completed ===';
END;
$$;

-- Test function implementations
CREATE OR REPLACE FUNCTION test_calculate_streak_empty_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT calculate_streak(p_user_id) INTO result;
  
  IF result = 0 THEN
    RAISE NOTICE 'PASS: Empty user returns 0 streak (got %)', result;
  ELSE
    RAISE NOTICE 'FAIL: Empty user should return 0, got %', result;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test_calculate_streak_single_entry(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT calculate_streak(p_user_id) INTO result;
  
  IF result = 1 THEN
    RAISE NOTICE 'PASS: Single entry today returns 1 streak (got %)', result;
  ELSE
    RAISE NOTICE 'FAIL: Single entry today should return 1, got %', result;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test_calculate_streak_consecutive(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT calculate_streak(p_user_id) INTO result;
  
  IF result = 5 THEN
    RAISE NOTICE 'PASS: Five consecutive entries return 5 streak (got %)', result;
  ELSE
    RAISE NOTICE 'FAIL: Five consecutive entries should return 5, got %', result;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test_calculate_streak_with_gap(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT calculate_streak(p_user_id) INTO result;
  
  -- After removing day 3, streak should be from today back to day 2 (2 days)
  IF result = 2 THEN
    RAISE NOTICE 'PASS: Streak with gap returns 2 (got %)', result;
  ELSE
    RAISE NOTICE 'FAIL: Streak with gap should return 2, got %', result;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test_calculate_streak_empty_statements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT calculate_streak(p_user_id) INTO result;
  
  -- Entry with empty statements should not count
  IF result = 0 THEN
    RAISE NOTICE 'PASS: Empty statements array returns 0 streak (got %)', result;
  ELSE
    RAISE NOTICE 'FAIL: Empty statements should return 0, got %', result;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test_calculate_streak_grace_period(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT calculate_streak(p_user_id) INTO result;
  
  -- Grace period: no entry today, but entry yesterday should give streak of 1
  IF result = 1 THEN
    RAISE NOTICE 'PASS: Grace period works - no entry today but yesterday gives 1 (got %)', result;
  ELSE
    RAISE NOTICE 'FAIL: Grace period should give 1 for yesterday entry, got %', result;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test_calculate_streak_long(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT calculate_streak(p_user_id) INTO result;
  
  IF result = 30 THEN
    RAISE NOTICE 'PASS: Long streak of 30 days works (got %)', result;
  ELSE
    RAISE NOTICE 'FAIL: Long streak should return 30, got %', result;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test_calculate_streak_complex(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT calculate_streak(p_user_id) INTO result;
  
  -- Current streak should be 4 (today back to 3 days ago)
  IF result = 4 THEN
    RAISE NOTICE 'PASS: Complex scenario returns 4 (got %)', result;
  ELSE
    RAISE NOTICE 'FAIL: Complex scenario should return 4, got %', result;
  END IF;
END;
$$;

-- Performance test for large datasets
CREATE OR REPLACE FUNCTION test_streak_performance()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTERVAL;
  result INTEGER;
BEGIN
  RAISE NOTICE '=== Performance Test: 1000 entries ===';
  
  start_time := clock_timestamp();
  
  -- Insert 1000 consecutive entries
  FOR i IN 0..999 LOOP
    INSERT INTO gratitude_entries (user_id, entry_date, statements)
    VALUES (test_user_id, CURRENT_DATE - i, jsonb_build_array('Performance test ' || i));
  END LOOP;
  
  -- Test the function
  SELECT calculate_streak(test_user_id) INTO result;
  
  end_time := clock_timestamp();
  duration := end_time - start_time;
  
  RAISE NOTICE 'Performance test completed: % entries processed in %', result, duration;
  
  -- Cleanup
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
  
  IF result = 1000 THEN
    RAISE NOTICE 'PASS: Performance test returned correct result';
  ELSE
    RAISE NOTICE 'FAIL: Performance test should return 1000, got %', result;
  END IF;
END;
$$;

-- Run performance test
SELECT test_streak_performance();

-- Test edge cases
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  result INTEGER;
BEGIN
  RAISE NOTICE '=== Edge Case Tests ===';
  
  -- Test with NULL user_id (should raise exception)
  BEGIN
    SELECT calculate_streak(NULL) INTO result;
    RAISE NOTICE 'FAIL: NULL user_id should raise exception';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS: NULL user_id correctly raises exception: %', SQLERRM;
  END;
  
  -- Test with future date
  INSERT INTO gratitude_entries (user_id, entry_date, statements)
  VALUES (test_user_id, CURRENT_DATE + 1, jsonb_build_array('Future entry'));
  
  SELECT calculate_streak(test_user_id) INTO result;
  RAISE NOTICE 'Future entry test result: % (should be 0 since no current/past entries)', result;
  
  -- Cleanup
  DELETE FROM gratitude_entries WHERE user_id = test_user_id;
END;
$$;

RAISE NOTICE 'All streak function tests completed. Review the results above.';

-- Cleanup test functions
DROP FUNCTION IF EXISTS test_calculate_streak_empty_user(UUID);
DROP FUNCTION IF EXISTS test_calculate_streak_single_entry(UUID);
DROP FUNCTION IF EXISTS test_calculate_streak_consecutive(UUID);
DROP FUNCTION IF EXISTS test_calculate_streak_with_gap(UUID);
DROP FUNCTION IF EXISTS test_calculate_streak_empty_statements(UUID);
DROP FUNCTION IF EXISTS test_calculate_streak_grace_period(UUID);
DROP FUNCTION IF EXISTS test_calculate_streak_long(UUID);
DROP FUNCTION IF EXISTS test_calculate_streak_complex(UUID);
DROP FUNCTION IF EXISTS test_streak_performance(); 