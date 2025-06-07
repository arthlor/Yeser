-- Rollback Migration: Drop gratitude_benefits table and related objects
-- Date: 2024-01-01
-- Author: Yeser Development Team
-- Purpose: Safely rollback the gratitude_benefits table creation

BEGIN;

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_gratitude_benefits_updated_at ON public.gratitude_benefits;

-- Drop RLS policies
DROP POLICY IF EXISTS "Authenticated users can read active benefits" ON public.gratitude_benefits;
DROP POLICY IF EXISTS "Service role can manage benefits" ON public.gratitude_benefits;

-- Drop indexes
DROP INDEX IF EXISTS idx_gratitude_benefits_active_order;
DROP INDEX IF EXISTS idx_gratitude_benefits_active;

-- Drop the table (this will also drop any remaining constraints)
DROP TABLE IF EXISTS public.gratitude_benefits CASCADE;

-- Note: We don't drop the update_updated_at_column function as it might be used by other tables

COMMIT; 