# Yeşer - New Gratitude Entry Logic Implementation Roadmap

## 1. Introduction

This document outlines the roadmap for refactoring Yeşer's gratitude entry system. The goal is to move from the current multi-input field approach on the daily entry screen to a more fluid, "feed-style" or "chat-style" interface. This will allow users to add multiple distinct gratitude statements for any given day seamlessly, enhancing the user experience and making gratitude logging more intuitive.

## 2. Core Principles & Goals

*   **Fluid User Experience:** Make adding multiple gratitudes feel natural and effortless, like jotting down quick notes.
*   **Low Friction:** Enable quick capture of gratitude moments, especially from the home screen.
*   **Clarity & Readability:** Present individual gratitude statements distinctly for easier review and reflection.
*   **Scalability:** Allow users to add an unlimited number of gratitude statements per day.
*   **Maintain Simplicity:** Preserve Yeşer's calm and minimalist ethos throughout the changes.

## 3. Prerequisites & Assumptions

*   **Existing Backend:** Supabase is the backend.
*   **Key Tables:** `gratitude_entries`, `profiles`, `streaks`.
*   **Core Change:** The `gratitude_entries` table needs to store an array of individual gratitude statements per day, replacing any previous single-text entry approach for multiple gratitudes.

## Module 0: Database Schema & RLS Update

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

## 4. Implementation Modules

### Module 1: Backend & Service Layer Adjustments

**Goal:** Ensure the backend (Supabase functions, triggers) and client-side services can efficiently manage an array of gratitude statements within a single daily entry record.

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
    *   Update `fetchGratitudesForDate` to fetch the `gratitude_entries` row and return its `statements` array.
    *   Create new methods to call the RPCs: `addStatement(date, statementText)`, `editStatement(date, index, newStatementText)`, `deleteStatement(date, index)`.
    *   Ensure robust error handling and data validation (e.g., using Zod for statement text before sending to RPC).

### Module 2: UI Components for Gratitude Display & Input

**Goal:** Create reusable components for displaying individual gratitude statements and for the new input method.

*   **Step 2.1: Create `GratitudeStatementItem.tsx` Component**
    *   Props: `statementText: string`, `onEdit?: () => void`, `onDelete?: () => void`, `isEditing?: boolean`.
    *   Displays the gratitude text (e.g., in a styled `Text` component, chip, or small card).
    *   Conditionally shows Edit/Delete icons/buttons if `onEdit`/`onDelete` are provided.
    *   If `isEditing` is true, it could render a `TextInput` pre-filled with `statementText` and a Save/Cancel button.
*   **Step 2.2: Create `GratitudeInputBar.tsx` Component**
    *   Props: `onSubmit: (text: string) => void`, `placeholder?: string`.
    *   Contains a `TextInput` and an "Ekle" (Add) / "Gönder" (Send) `Button`.
    *   Manages its own input state.
    *   Calls `onSubmit` with the input text when the button is pressed, then clears the input.

### Module 3: `EnhancedDailyEntryScreen.tsx` Refactor

**Goal:** Transform the screen to manage and display a list of individual gratitude statements for a selected day.

*   **Step 3.1: Integrate `GratitudeInputBar.tsx`**
    *   Place it at the bottom or top of the screen for adding new statements.
    *   The `onSubmit` handler will call the `addStatement` service method.
*   **Step 3.2: Implement `FlatList` to Display `GratitudeStatementItem`s**
    *   Fetch the list of statements for the selected date using the service.
    *   Render each statement using the `GratitudeStatementItem` component.
    *   Pass appropriate `onEdit` and `onDelete` handlers to each item, linking to service methods.
*   **Step 3.3: Handle Add/Edit/Delete Logic**
    *   Implement state for managing which item is currently being edited (if inline editing is chosen).
    *   Ensure the list refreshes (optimistically or after service confirmation) upon add, edit, or delete.
    *   Utilize `scrollViewRef.current?.scrollToEnd()` after adding a new item.
*   **Step 3.4: Update State Management & Data Fetching**
    *   Fetch the daily entry (including its `statements` array) when the screen loads for a specific date.
    *   Handle loading, empty (no statements for the day), and error states gracefully.

### Module 4: `EnhancedHomeScreen.tsx` Refactor

**Goal:** Enable quick-add functionality and display a summary of today's gratitudes.

*   **Step 4.1: Integrate `GratitudeInputBar.tsx` for Quick Add**
    *   Place it prominently on the home screen.
    *   `onSubmit` handler calls the `addStatement` service method for the *current date*.
*   **Step 4.2: Implement "Today's Gratitude Summary" Section**
    *   Display a count of today's gratitudes (e.g., "Bugünkü Şükürlerin: 3 adet").
    *   Optionally, show the last 1-2 statements added today.
    *   This section should fetch data for the current date.
*   **Step 4.3: Navigation to `EnhancedDailyEntryScreen`**
    *   Ensure tapping the "Today's Gratitude Summary" or a similar CTA navigates to the `EnhancedDailyEntryScreen` pre-filled for the current date.

### Module 5: State Management & Data Flow (Zustand)

**Goal:** Adapt global state to support the new data structure and ensure a reactive UI.

*   **Step 5.1: Review and Update Zustand Stores**
    *   The store holding daily entries (`dailyEntryStore` or `gratitudeStore`) should now manage the `statements` array as part of a daily entry object.
    *   Actions for adding, editing, and deleting statements should update this array in the store.
*   **Step 5.2: Implement Optimistic Updates**
    *   For a smoother UX, UI should reflect changes immediately (e.g., new statement appears in the list) while the backend call is in progress.
    *   Implement logic to revert optimistic updates if a backend call fails, with appropriate error feedback.

### Module 6: Testing

**Goal:** Ensure the new logic is robust and bug-free.

*   **Step 6.1: Write/Update Unit Tests for Service Layer**
    *   Test `gratitudeApi.ts` methods for adding, editing, deleting statements, including edge cases and error handling.
    *   Mock Supabase client calls.
*   **Step 6.2: Write Component Tests for New UI Components**
    *   Test `GratitudeStatementItem.tsx` for rendering, interaction (edit/delete buttons if applicable).
    *   Test `GratitudeInputBar.tsx` for input handling and `onSubmit` callback.
*   **Step 6.3: Write/Update Integration Tests for Screens**
    *   Test `EnhancedDailyEntryScreen.tsx`: adding, viewing, editing, deleting statements; empty and loading states.
    *   Test `EnhancedHomeScreen.tsx`: quick-add functionality, summary display, navigation.

### Module 7: UI/UX Polish & Refinements

**Goal:** Enhance the overall user experience of the new system.

*   **Step 7.1: Animations & Transitions**
    *   Consider subtle animations for adding/removing items from the list (e.g., using `LayoutAnimation` or `react-native-reanimated`).
*   **Step 7.2: Empty State Handling**
    *   Provide clear and encouraging messages on `EnhancedDailyEntryScreen` when no gratitudes are logged for a day.
*   **Step 7.3: Error Handling**
    *   Display user-friendly error messages if adding/editing/deleting a statement fails (e.g., network issue).
    *   Implement retry mechanisms where appropriate.
*   **Step 7.4: Keyboard Management**
    *   Ensure smooth keyboard appearance and dismissal, especially on the `EnhancedDailyEntryScreen` with the input bar.

## 5. Timeline & Priorities (High-Level Suggestion)

This can be implemented iteratively:

1.  **Sprint 1: Foundation** (Module 0 (if needed), Module 1, Module 2)
    *   Focus: Backend, services, and basic UI components.
2.  **Sprint 2: Daily Entry Screen** (Module 3, initial parts of Module 5 & 6)
    *   Focus: Get the `EnhancedDailyEntryScreen` working with the new logic.
3.  **Sprint 3: Home Screen & Polish** (Module 4, Module 7, remaining Module 5 & 6)
    *   Focus: Integrate quick-add on home, refine UX, and complete testing.

## 6. Future Considerations (Post-Implementation)

*   **Editing History:** The new structure could potentially support viewing an edit history for individual statements (more complex).
*   **Search within Daily Entries:** If a day has many statements, local search/filter on the `EnhancedDailyEntryScreen` could be useful.

This roadmap provides a structured approach to implementing the desired changes. Each module and step can be further broken down into smaller tasks as development progresses.
