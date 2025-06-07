# Database Migration Instructions

## "Why Gratitude Matters" Feature Migration

This document provides step-by-step instructions for applying the database migration to add the `gratitude_benefits` table.

## Prerequisites

- Access to your Supabase project dashboard
- Admin/service role permissions in Supabase

## Migration Steps

### 1. Access Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com) and log in
2. Select your Yeser project
3. Navigate to **SQL Editor** in the left sidebar

### 2. Run the Migration Script

1. Copy the contents of `docs/migrations/001_create_gratitude_benefits_table.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the migration

### 3. Verify Migration Success

After running the migration, verify it was successful:

```sql
-- Check if table was created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'gratitude_benefits';

-- Check if data was inserted
SELECT COUNT(*) as benefit_count
FROM gratitude_benefits
WHERE is_active = true;

-- View the inserted benefits
SELECT id, title_tr, display_order
FROM gratitude_benefits
ORDER BY display_order;
```

You should see:

- Table `gratitude_benefits` exists
- 6 benefits inserted
- Benefits ordered by `display_order`

### 4. Update TypeScript Types (Optional)

After the migration, you can regenerate the TypeScript types:

```bash
# If you have Supabase CLI installed
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.types.ts
```

This will add proper TypeScript support for the new table.

### 5. Test the Feature

1. Start your development server: `npm start`
2. Navigate to the "Why Gratitude Matters" screen
3. Verify that:
   - Benefits load correctly
   - Cards expand/collapse properly
   - CTA button works
   - Analytics are tracked

## Rollback Instructions

If you need to rollback the migration:

1. Run the rollback script: `docs/migrations/001_rollback_gratitude_benefits_table.sql`
2. This will safely remove the table and all related objects

## Troubleshooting

### Migration Fails

- **Error: "relation already exists"**: The table might already exist. Check if it was created previously.
- **Error: "permission denied"**: Ensure you have admin/service role permissions.
- **Error: "syntax error"**: Copy the entire migration script, including BEGIN/COMMIT statements.

### App Shows Loading State

- Verify the migration completed successfully
- Check browser console for API errors
- Ensure RLS policies are correctly applied

### No Data Displayed

- Check if benefits were inserted: `SELECT * FROM gratitude_benefits;`
- Verify `is_active = true` for the benefits
- Check if user is authenticated (RLS requires authentication)

## Migration Details

The migration creates:

- `gratitude_benefits` table with proper constraints
- Performance indexes for efficient querying
- Row Level Security (RLS) policies
- Initial content (6 benefits in Turkish)
- Automatic timestamp management

## Next Steps

After successful migration:

1. Test the feature thoroughly
2. Consider adding more benefits through the Supabase dashboard
3. Monitor performance and user engagement
4. Plan for content management workflows

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Verify all prerequisites are met
4. Contact the development team if needed
