# Audit Fix Pack

These root-level `fix_*.sql` files map 1:1 to the audit findings. Run them in
numeric order against your Supabase project (SQL editor or `psql`). Every file
is idempotent.

| #   | File                                          | Addresses                                                                            | Severity |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------ | -------- |
| 01  | fix_01_rotate_cron_service_role.sql           | Hardcoded service_role JWT in cron; "Bearer Bearer"                                  | P0       |
| 02  | fix_02_mood_insight_range_constraint.sql      | `mood_insight_snapshots.range` now allows 90d                                        | P0       |
| 03  | fix_03_update_mood_analytics_range.sql        | `get_mood_analytics` 15d/30d/90d branches                                            | P0       |
| 04  | fix_04_secure_idor_functions.sql              | IDOR in `get_entry_dates_for_month`, `get_random_gratitude_entry`                    | P0       |
| 05  | fix_05_localize_daily_prompts.sql             | `get_random_active_prompt` now language-aware                                        | P1       |
| 06  | fix_06_paginated_entries_with_attachments.sql | Canonical `get_gratitude_entries_paginated` incl. attachments and empty-entry filter | P1       |
| 07  | fix_07_notification_windows_matview.sql       | Creates the missing `notification_windows` matview                                   | P1       |
| 08  | fix_08_harmonize_streak_calculation.sql       | Trigger + RPC share one streak implementation                                        | P1       |
| 09  | fix_09_timezone_constraint.sql                | `profiles.timezone` now validates against `pg_timezone_names`                        | P1       |
| 10  | fix_10_cleanup_empty_moods.sql                | Strips `""` mood values and teaches RPC to treat `''` as `NULL`                      | P1       |
| 11  | fix_11_ensure_handle_new_user_trigger.sql     | Ensures `on_auth_user_created` trigger exists                                        | P1       |
| 12  | fix_12_delete_user_edge_function.sql          | Cascade FKs + `delete_current_user_cascade` RPC                                      | P0\*     |

`fix_12` still requires an edge function deployment at
`supabase/functions/delete-user/`; the SQL file only prepares the server side.

## Client-side fixes applied in the same change set

- `src/features/gratitude/api.ts`
  - `setStatementMood` now passes `null` (not `''`) when clearing.
- `src/features/gratitude/promptsApi.ts`
  - Both RPC callers now pass the user's language.
- `src/features/gratitude/mediaApi.ts`
  - Removed the `rpcOf(client) as RpcClient` cast; types for the media RPCs
    and the `gratitude_attachments` table are now declared in
    `src/types/supabase.types.ts`.
- `src/types/supabase.types.ts`
  - Added `public.gratitude_attachments` table types, `attach_media_to_statement`,
    `delete_attachment`, `list_attachments_for_date`, and the paginated
    entries `attachments` field.

After running all SQL files, regenerate `supabase.types.ts` with
`npx supabase gen types typescript` to overwrite the manual additions with
the authoritative auto-generated version.
