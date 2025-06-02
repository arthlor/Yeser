# Module 6: Testing

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
