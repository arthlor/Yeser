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

## 4. Implementation Modules

This refactor is broken down into the following modules. Each module has a detailed roadmap in its respective document:

*   [Module 0: Database Schema & RLS Update](./00-database-schema-rls.md)
*   [Module 1: Backend & Service Layer Adjustments](./01-backend-services.md)
*   [Module 2: UI Components for Gratitude Display & Input](./02-ui-components.md)
*   [Module 3: `EnhancedDailyEntryScreen.tsx` Refactor](./03-daily-entry-screen.md)
*   [Module 4: `EnhancedHomeScreen.tsx` Refactor](./04-home-screen.md)
*   [Module 5: State Management & Data Flow (Zustand)](./05-state-management.md)
*   [Module 6: Testing](./06-testing.md)
*   [Module 7: UI/UX Polish & Refinements](./07-ui-ux-polish.md)

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
