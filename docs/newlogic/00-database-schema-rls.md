# Module 0: Database Schema & RLS Update

**Goal:** Adapt the `gratitude_entries` table to store multiple gratitude statements per day and ensure RLS policies are appropriate.

*   **Task 0.1: Define/Update `gratitude_entries` Table Structure**
    *   **Current Assumption:** The table has columns like `entry_id UUID PRIMARY KEY`, `user_id UUID REFERENCES auth.users(id)`, `entry_date DATE`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, and potentially an `entry_text TEXT` column for a single gratitude.
    *   **Action:** Add/Ensure a `statements JSONB NOT NULL DEFAULT '[]'::jsonb` column. This column will store an array of text strings, where each string is an individual gratitude statement.
    *   Consider if the existing `entry_text` column (if it exists and holds single entries) should be deprecated or used as a title/summary if desired (though the new model focuses on the `statements` array).

*   **Task 0.2: (Optional) Data Migration Script**
    *   If existing `gratitude_entries` (e.g., in `entry_text`) represent multiple items or need to be preserved as the first item in the new `statements` array, write a one-time migration script.
    *   Example: `UPDATE gratitude_entries SET statements = jsonb_build_array(entry_text) WHERE entry_text IS NOT NULL AND statements = '[]'::jsonb;` (This is a basic example; tailor as needed).

*   **Task 0.3: Review and Update RLS Policies**
    *   **`gratitude_entries` Table RLS:**
        *   **Existing Policies (Summary from provided details):**
            *   `DELETE`: Allows users to delete their own entries.
            *   `INSERT`: Allows users to insert their own entries.
            *   `SELECT`: Allows users to read their own entries.
            *   `UPDATE`: Allows users to update their own entries.
        *   **Action:** Verify these policies correctly apply to the new `statements` column. Ensure that a user can only modify their own `statements` array. The existing policies based on `user_id = auth.uid()` should generally cover this, but review is good practice.

    *   **`profiles` Table RLS (Context):**
        *   `SELECT`: Allows users to read their own profile.
        *   `UPDATE`: Allows users to update their own profile.

    *   **`streaks` Table RLS (Context):**
        *   `INSERT`: Allows individual insert for own streak.
        *   `SELECT`: Allows individual read access for own streak.
        *   `UPDATE`: Allows individual update for own streak.
