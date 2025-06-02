# Module 1: Backend & Service Layer Adjustments

**Goal:** Ensure the backend (Supabase functions, triggers) and client-side services can efficiently manage an array of gratitude statements within a single daily entry record.

**Status: Completed (as of 2025-06-02)**
Key achievements:
- Successfully implemented Supabase RPC functions (`add_gratitude_statement`, `edit_gratitude_statement`, `delete_gratitude_statement`) for atomic CRUD operations on individual gratitude statements within a daily entry's `statements` JSONB array.
- The `delete_gratitude_statement` RPC now also handles the deletion of the parent `gratitude_entries` row if the `statements` array becomes empty.
- Thoroughly refactored the client-side API service (`src/api/gratitudeApi.ts`) to:
    - Utilize the new RPC functions for all statement manipulations.
    - Correctly fetch and map daily entries, including the `statements` array.
    - Introduce new TypeScript interfaces (`GratitudeDailyEntry`, `SelectedGratitudeEntryData`) for type safety with the new data model.
    - Remove obsolete functions related to the previous single-content entry system.
- Regenerated Supabase TypeScript types (`src/types/supabase.types.ts`) to align with backend changes.
- Resolved TypeScript type mismatches and ESLint parsing issues in `gratitudeApi.ts`.

*   **Step 1.1: Existing Supabase Triggers Review**
    *   `handle_gratitude_entries_update_updated_at`: (BEFORE UPDATE on `gratitude_entries`) - Updates `updated_at`. *Should continue to work correctly.*
    *   `handle_streaks_update_updated_at`: (BEFORE UPDATE on `streaks`) - Updates `updated_at`. *Should continue to work correctly.*
    *   `on_gratitude_entry_change`: (AFTER INSERT OR DELETE OR UPDATE OF `entry_date` on `gratitude_entries`) - Executes `update_user_streak()`.
        *   **Action:** This trigger is crucial. It needs to correctly fire when a `gratitude_entries` row is created (first statement for the day) or when the `statements` array becomes empty (last statement for the day deleted, potentially leading to the deletion of the row itself if that's the design).
        *   If an entry for a day is defined by having a non-empty `statements` array, this trigger might need to be adjusted or the conditions within `update_user_streak` re-evaluated.
    *   `handle_updated_at`: (BEFORE UPDATE on `profiles`) - Updates `updated_at` using `moddatetime`. *Should continue to work correctly.*

*   **Step 1.2: Existing Supabase Functions Review & Potential Adjustments**
    *   `update_updated_at_column()`: Generic function to set `updated_at`. *No changes needed.*
    *   `update_user_streak()`:
        *   **Current Logic:** Iterates through `gratitude_entries` for a user to calculate current and longest streaks.
        *   **Action:** This function's logic relies on the existence of rows in `gratitude_entries` for specific dates. If an entry for a day is now defined by the `statements` array not being empty (rather than just the row existing, perhaps with an empty `entry_text`), this function should still work correctly as long as rows are inserted/deleted appropriately when statements are added/removed.
        *   Ensure that a `gratitude_entries` row is created only when the first statement is added for a day, and potentially deleted if all statements for that day are removed (to avoid empty entries affecting streak logic).
    *   `moddatetime()`: C function for `updated_at`. *No changes needed.*
    *   `calculate_streak(p_user_id uuid)`:
        *   **Current Logic:** Calculates current streak based on distinct `entry_date`s.
        *   **Action:** Similar to `update_user_streak`, this should function correctly if the presence of a row in `gratitude_entries` accurately reflects a day with at least one gratitude statement.
    *   `get_random_gratitude_entry(p_user_id uuid)`:
        *   **Current Logic:** Returns a full `gratitude_entries` row randomly.
        *   **Action:** This function will now return a daily entry object which includes the `statements` array. The client-side will then need to pick a random statement from this array if the goal is to show a single random gratitude statement. Consider if a new function `get_random_gratitude_statement(p_user_id uuid)` that directly returns a text statement would be more useful.
    *   `get_entry_dates_for_month(p_user_id uuid, p_year integer, p_month integer)`:
        *   **Current Logic:** Returns distinct entry dates for a given month.
        *   **Action:** *Should continue to work correctly.*
    *   `handle_new_user()`: Trigger function for new user profile creation. *No changes needed for this refactor.*

*   **Step 1.3: New/Update Supabase RPC Functions for Statement Management (Recommended for Atomicity)**
    *   **Status: Completed.** The RPC functions `add_gratitude_statement`, `edit_gratitude_statement`, and `delete_gratitude_statement` were implemented as described. The `delete_gratitude_statement` RPC includes logic to remove the parent `gratitude_entries` row if the `statements` array becomes empty.
    *   These functions will operate on the `statements` JSONB array within a `gratitude_entries` row.
    *   `add_gratitude_statement(p_entry_date DATE, p_statement TEXT)`:
        *   Appends `p_statement` to the `statements` array for the `auth.uid()` and `p_entry_date`.
        *   If no `gratitude_entries` row exists for that user/date, it creates one with the new statement in the array.
        *   SQL (Conceptual): `INSERT INTO gratitude_entries (user_id, entry_date, statements) VALUES (auth.uid(), p_entry_date, jsonb_build_array(p_statement)) ON CONFLICT (user_id, entry_date) DO UPDATE SET statements = gratitude_entries.statements || jsonb_build_array(p_statement);`
    *   `edit_gratitude_statement(p_entry_date DATE, p_statement_index INT, p_updated_statement TEXT)`: (0-indexed)
        *   Updates the statement at `p_statement_index` in the `statements` array for `auth.uid()` and `p_entry_date`.
        *   SQL (Conceptual): `UPDATE gratitude_entries SET statements = jsonb_set(statements, ARRAY[p_statement_index]::TEXT[], to_jsonb(p_updated_statement)) WHERE user_id = auth.uid() AND entry_date = p_entry_date;`
    *   `delete_gratitude_statement(p_entry_date DATE, p_statement_index INT)`: (0-indexed)
        *   Removes the statement at `p_statement_index` from the `statements` array.
        *   SQL (Conceptual): `UPDATE gratitude_entries SET statements = statements - p_statement_index WHERE user_id = auth.uid() AND entry_date = p_entry_date;`
        *   **Consideration:** If `statements` becomes empty after deletion, should the entire `gratitude_entries` row be deleted? This would simplify streak logic but requires careful handling in the RPC or a separate trigger.

*   **Step 1.4: Refactor `gratitudeApi.ts` (or equivalent client-side service)**
    *   **Status: Completed.** `gratitudeApi.ts` has been fully refactored:
        *   Calls the new RPCs (`addStatement`, `editStatement`, `deleteStatement`) for managing individual gratitude statements.
        *   Fetching functions (`getGratitudeDailyEntries`, `getGratitudeDailyEntryByDate`, `getRandomGratitudeDailyEntry`) now correctly handle the `statements` array.
        *   New TypeScript interfaces (`GratitudeDailyEntry`, `SelectedGratitudeEntryData`) are defined and used for type safety.
        *   Obsolete functions and types related to the old single-content model have been removed.
        *   TypeScript and ESLint issues within this file were resolved.
    *   Update `fetchGratitudesForDate` to fetch the `gratitude_entries` row and return its `statements` array.
    *   Create new methods to call the RPCs: `addStatement(date, statementText)`, `editStatement(date, index, newStatementText)`, `deleteStatement(date, index)`.
    *   Ensure robust error handling and data validation (e.g., using Zod for statement text before sending to RPC).
