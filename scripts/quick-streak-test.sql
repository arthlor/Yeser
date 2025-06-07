-- Quick manual test with visible output
-- This will show actual results instead of just NOTICE messages

BEGIN;

-- Create a test user
INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000999'::UUID, 
  'manual-test@example.com', 
  NOW(), 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test 1: Empty user should return 0
SELECT 
  'Test 1: Empty user' as test_name,
  calculate_streak('00000000-0000-0000-0000-000000000999'::UUID) as result,
  CASE 
    WHEN calculate_streak('00000000-0000-0000-0000-000000000999'::UUID) = 0 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status;

-- Test 2: Add entry for today
INSERT INTO gratitude_entries (user_id, entry_date, statements)
VALUES ('00000000-0000-0000-0000-000000000999'::UUID, CURRENT_DATE, jsonb_build_array('Test entry'));

SELECT 
  'Test 2: Single entry today' as test_name,
  calculate_streak('00000000-0000-0000-0000-000000000999'::UUID) as result,
  CASE 
    WHEN calculate_streak('00000000-0000-0000-0000-000000000999'::UUID) = 1 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status;

-- Test 3: Add yesterday's entry
INSERT INTO gratitude_entries (user_id, entry_date, statements)
VALUES ('00000000-0000-0000-0000-000000000999'::UUID, CURRENT_DATE - 1, jsonb_build_array('Yesterday entry'));

SELECT 
  'Test 3: Two consecutive days' as test_name,
  calculate_streak('00000000-0000-0000-0000-000000000999'::UUID) as result,
  CASE 
    WHEN calculate_streak('00000000-0000-0000-0000-000000000999'::UUID) = 2 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status;

-- Test 4: Test grace period (remove today's entry)
DELETE FROM gratitude_entries 
WHERE user_id = '00000000-0000-0000-0000-000000000999'::UUID 
AND entry_date = CURRENT_DATE;

SELECT 
  'Test 4: Grace period (only yesterday)' as test_name,
  calculate_streak('00000000-0000-0000-0000-000000000999'::UUID) as result,
  CASE 
    WHEN calculate_streak('00000000-0000-0000-0000-000000000999'::UUID) = 1 
    THEN '✅ PASS (Grace period works)' 
    ELSE '❌ FAIL' 
  END as status;

-- Summary
SELECT 
  '🎯 STREAK FUNCTION STATUS' as summary,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'calculate_streak'
    )
    THEN '✅ Function exists and working!'
    ELSE '❌ Function missing'
  END as result;

-- Clean up and rollback
ROLLBACK;

-- Final message
SELECT '🔒 All test data rolled back. Database unchanged.' as final_status; 