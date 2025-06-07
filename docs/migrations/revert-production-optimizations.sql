-- REVERT: Production Readiness Database Optimizations
-- This file safely reverts all changes made by production-optimizations.sql
-- 
-- ⚠️  WARNING: Only run this if you need to rollback due to issues
-- ⚠️  IMPORTANT: Test in staging environment first
-- 
-- WHEN TO USE THIS:
-- - New RPC functions are causing errors
-- - Performance is worse than before
-- - Database issues after migration
-- - Need to rollback to stable state
--
-- WHAT THIS DOES:
-- - Removes new RPC functions
-- - Revokes new permissions  
-- - Drops new indexes (safely)
-- - Restores original functionality

-- =============================================================================
-- ROLLBACK VERIFICATION
-- =============================================================================

-- First, let's check what we're about to remove
DO $$
BEGIN
    RAISE NOTICE '=== ROLLBACK VERIFICATION ===';
    RAISE NOTICE 'About to remove the following functions:';
    RAISE NOTICE '- get_multiple_random_active_prompts(INTEGER)';
    RAISE NOTICE '- delete_gratitude_entry_by_date(DATE)';
    RAISE NOTICE '- get_user_gratitude_entries_count()';
    RAISE NOTICE '';
    RAISE NOTICE 'About to remove the following indexes:';
    RAISE NOTICE '- idx_daily_prompts_active_random';
    RAISE NOTICE '- idx_gratitude_entries_user_date';
    RAISE NOTICE '- idx_gratitude_entries_user_count';
    RAISE NOTICE '';
    RAISE NOTICE 'This will revert to original API behavior.';
    RAISE NOTICE 'Continue only if you want to rollback.';
END $$;

-- =============================================================================
-- STEP 1: REVOKE PERMISSIONS
-- =============================================================================

-- Revoke execute permissions we granted
-- Note: This won't fail if permissions don't exist
DO $$
BEGIN
    -- Revoke function permissions
    BEGIN
        REVOKE EXECUTE ON FUNCTION get_multiple_random_active_prompts(INTEGER) FROM authenticated;
        RAISE NOTICE 'Revoked: get_multiple_random_active_prompts permissions';
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'Function get_multiple_random_active_prompts does not exist (already removed?)';
    END;

    BEGIN
        REVOKE EXECUTE ON FUNCTION delete_gratitude_entry_by_date(DATE) FROM authenticated;
        RAISE NOTICE 'Revoked: delete_gratitude_entry_by_date permissions';
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'Function delete_gratitude_entry_by_date does not exist (already removed?)';
    END;

    BEGIN
        REVOKE EXECUTE ON FUNCTION get_user_gratitude_entries_count() FROM authenticated;
        RAISE NOTICE 'Revoked: get_user_gratitude_entries_count permissions';
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'Function get_user_gratitude_entries_count does not exist (already removed?)';
    END;
END $$;

-- =============================================================================
-- STEP 2: DROP FUNCTIONS
-- =============================================================================

-- Drop the new RPC functions we created
-- Using IF EXISTS to prevent errors if they don't exist

DROP FUNCTION IF EXISTS get_multiple_random_active_prompts(INTEGER);
DROP FUNCTION IF EXISTS delete_gratitude_entry_by_date(DATE);
DROP FUNCTION IF EXISTS get_user_gratitude_entries_count();

-- Confirm removal
DO $$
BEGIN
    RAISE NOTICE 'Dropped all production optimization functions';
END $$;

-- =============================================================================
-- STEP 3: DROP INDEXES (CAREFULLY)
-- =============================================================================

-- Drop indexes we created, but only if they exist
-- Using CASCADE in case they're referenced anywhere

-- Index for daily_prompts random selection
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_daily_prompts_active_random') THEN
        DROP INDEX idx_daily_prompts_active_random;
        RAISE NOTICE 'Dropped index: idx_daily_prompts_active_random';
    ELSE
        RAISE NOTICE 'Index idx_daily_prompts_active_random does not exist';
    END IF;
END $$;

-- Index for gratitude_entries user + date queries
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_gratitude_entries_user_date') THEN
        DROP INDEX idx_gratitude_entries_user_date;
        RAISE NOTICE 'Dropped index: idx_gratitude_entries_user_date';
    ELSE
        RAISE NOTICE 'Index idx_gratitude_entries_user_date does not exist';
    END IF;
END $$;

-- Index for gratitude_entries count queries  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_gratitude_entries_user_count') THEN
        DROP INDEX idx_gratitude_entries_user_count;
        RAISE NOTICE 'Dropped index: idx_gratitude_entries_user_count';
    ELSE
        RAISE NOTICE 'Index idx_gratitude_entries_user_count does not exist';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: VERIFICATION
-- =============================================================================

-- Verify that functions are gone
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    RAISE NOTICE '=== ROLLBACK VERIFICATION ===';
    
    -- Check if our functions still exist
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_multiple_random_active_prompts',
        'delete_gratitude_entry_by_date',
        'get_user_gratitude_entries_count'
    );
    
    IF func_count = 0 THEN
        RAISE NOTICE '✅ All production optimization functions removed successfully';
    ELSE
        RAISE NOTICE '⚠️  Warning: % production optimization functions still exist', func_count;
    END IF;
    
    -- Check if our indexes still exist
    SELECT COUNT(*) INTO func_count
    FROM pg_indexes 
    WHERE indexname IN (
        'idx_daily_prompts_active_random',
        'idx_gratitude_entries_user_date', 
        'idx_gratitude_entries_user_count'
    );
    
    IF func_count = 0 THEN
        RAISE NOTICE '✅ All production optimization indexes removed successfully';
    ELSE
        RAISE NOTICE '⚠️  Warning: % production optimization indexes still exist', func_count;
    END IF;
END $$;

-- =============================================================================
-- ROLLBACK COMPLETION NOTES
-- =============================================================================

/*
🎯 ROLLBACK COMPLETED

WHAT WAS REVERTED:
✅ Removed get_multiple_random_active_prompts() function
✅ Removed delete_gratitude_entry_by_date() function  
✅ Removed get_user_gratitude_entries_count() function
✅ Revoked all new permissions
✅ Dropped all new indexes

EXPECTED BEHAVIOR AFTER ROLLBACK:
- Multi-prompt fetching: Returns to client-side shuffling (slower but works)
- Entry deletion: Returns to multiple API calls (slower but works)
- Entry count: Returns to SELECT(*) with count (slower but works)
- All original functionality preserved

APPLICATION CODE IMPACT:
⚠️  The application code still contains calls to the removed RPC functions
⚠️  This will cause TypeScript/runtime errors until code is reverted

NEXT STEPS AFTER ROLLBACK:
1. Verify application works with original database state
2. If needed, revert application code changes:
   - src/api/promptApi.ts (revert to client-side shuffling)
   - src/api/gratitudeApi.ts (revert deleteEntireEntry and getTotalGratitudeEntriesCount)
   - src/features/gratitude/hooks/useGratitudeMutations.ts (revert to deleteAllStatementsForEntry)
3. Test thoroughly before considering re-deployment
4. Investigate what caused the need for rollback

MONITORING AFTER ROLLBACK:
- Check application error rates return to normal
- Verify all gratitude features work correctly
- Monitor performance (will be slower than optimized version)
- Confirm user experience is restored

If you need to re-apply optimizations later:
- Fix any issues that caused the rollback
- Re-run production-optimizations.sql
- Re-deploy application code
- Monitor carefully during re-deployment
*/ 