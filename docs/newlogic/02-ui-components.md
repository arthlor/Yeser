# Module 2: UI Components for Gratitude Display & Input

**Goal:** Create reusable components for displaying individual gratitude statements and for the new input method.

**Status: Completed (as of 2025-06-02)**
Key achievements:
- Created `src/components/GratitudeStatementItem.tsx`: A reusable component to display an individual gratitude statement, with conditional rendering for edit/delete actions and an editing mode with text input and save/cancel options.
- Created `src/components/GratitudeInputBar.tsx`: A reusable component featuring a text input and an 'Add' button for submitting new gratitude statements, including input validation and placeholder text.

*   **Step 2.1: Create `GratitudeStatementItem.tsx` Component**
    *   **Status: Completed.** Component created at `src/components/GratitudeStatementItem.tsx`. It handles display, edit, and delete functionalities for a single statement.
    *   Props: `statementText: string`, `onEdit?: () => void`, `onDelete?: () => void`, `isEditing?: boolean`.
    *   Displays the gratitude text (e.g., in a styled `Text` component, chip, or small card).
    *   Conditionally shows Edit/Delete icons/buttons if `onEdit`/`onDelete` are provided.
    *   If `isEditing` is true, it could render a `TextInput` pre-filled with `statementText` and a Save/Cancel button.
*   **Step 2.2: Create `GratitudeInputBar.tsx` Component**
    *   **Status: Completed.** Component created at `src/components/GratitudeInputBar.tsx`. It provides an input field and submission button for new statements. Linting issues have been resolved.
    *   Props: `onSubmit: (text: string) => void`, `placeholder?: string`.
    *   Contains a `TextInput` and an "Ekle" (Add) / "Gönder" (Send) `Button`.
    *   Manages its own input state.
    *   Calls `onSubmit` with the input text when the button is pressed, then clears the input.
