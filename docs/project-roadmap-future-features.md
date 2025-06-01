# Yeşer - Project Roadmap & Future Features

## 1. Introduction

This document outlines the phased development approach for Yeşer, detailing completed milestones, current development focus, and potential future enhancements. Our roadmap is guided by the core mission of providing a simple, calming, and valuable gratitude journaling experience for our target user, Ayşe.

## 2. Guiding Principles for Roadmap

*   **User Value First:** Prioritize features that directly enhance Ayşe's ability to cultivate gratitude and reflect positively.
*   **Simplicity & Clarity:** Maintain the app's minimalist design and intuitive user experience.
*   **Calm Technology:** Avoid intrusive notifications or features that create anxiety; promote mindful engagement.
*   **Iterative Development:** Release features in manageable phases, gathering feedback (even if informal) to guide next steps.
*   **Technical Sustainability:** Choose technologies and approaches that ensure long-term maintainability and scalability.

## 3. Phase 1: MVP - Core Gratitude Journal (Completed)

The focus of Phase 1 was to deliver the essential features for a functional gratitude journaling application.

*   **Authentication:**
    *   Email/Password sign-up and sign-in. (Implemented)
    *   Google OAuth for seamless authentication. (Implemented)
*   **Gratitude Entries:**
    *   Create, Read, Update, and Delete (CRUD) operations for daily gratitude entries. (Implemented)
    *   Simple text-based entries. (Implemented)
*   **Streak Tracking:**
    *   Daily streak calculation and display to encourage consistent practice. (Implemented)
*   **Basic Settings:**
    *   Ability to set a daily reminder time. (Implemented)
*   **Onboarding:**
    *   A simple onboarding wizard to introduce the app's purpose and core features. (Implemented)
*   **User Interface:**
    *   Core UI/UX designed in Turkish, catering to the primary target audience. (Implemented)
    *   Light and Dark themes. (Implemented)

## 4. Phase 2: Enhancements & Early Engagement (Completed)

Phase 2 aimed to enhance the core experience and introduce initial engagement features.

*   **Entry Management:**
    *   "Past Entries" screen to view, search (basic), and filter previous gratitude entries. (Implemented)
*   **Enhanced Settings:**
    *   Theme selection (Light/Dark). (Implemented)
    *   Toggle for "Throwback" reminders (feature itself planned for Phase 3). (Implemented - UI Toggle)
*   **UI/UX Improvements:**
    *   Refined UI elements and overall theming for a more polished look and feel. (Implemented)
*   **Analytics:**
    *   Integration with Google Analytics 4 (GA4) via `@react-native-firebase/analytics` to understand user engagement with core features. (Implemented)
*   **Notifications:**
    *   Robust local notification system for daily reminders. (Implemented)

## 5. Phase 3: Deepening Engagement & Polish (Current Focus / In Progress)

This phase focuses on features that deepen user engagement and further polish the application.

*   **Calendar View:**
    *   Visual calendar to see entries by date and easily navigate to past entries. (Planned / In Progress)
*   **"Throwback" Reminders:**
    *   Feature to surface a random past entry as a special reminder, promoting reflection. (Planned / In Progress)
*   **Milestones & Achievements (Conceptual):**
    *   Simple, non-intrusive acknowledgments for milestones (e.g., X-day streak, Y total entries). (Conceptual)
*   **UI Polish & Animations:**
    *   Subtle animations and transitions to enhance the user experience without being distracting. (Ongoing)
*   **Accessibility (A11y):**
    *   Continued focus on improving accessibility, including thorough testing with screen readers and dynamic font sizes. (Ongoing)

## 6. Phase 4 & Beyond: Future Vision (Conceptual / Future Considerations)

These are potential features and enhancements that may be considered post-launch, depending on user feedback and strategic priorities.

*   **Authentication:**
    *   Apple Sign-In. (Conceptual)
*   **Entry Enhancements:**
    *   Advanced search and filtering (e.g., by keywords, tags). (Conceptual)
    *   Option to add tags to entries. (Conceptual)
    *   Supabase Storage for attaching a single image or short audio reflection to an entry. (Conceptual)
*   **User Data Management:**
    *   Secure data export feature for users. (Conceptual)
*   **Personalization & Content:**
    *   More theme options or minor customization settings. (Conceptual)
    *   Curated (optional) prompts or inspirational quotes related to gratitude. (Conceptual)
*   **Platform Features:**
    *   Home screen widgets (iOS/Android) for quick entry or streak display. (Conceptual)
*   **Offline Support:**
    *   Initial read-only access to existing entries when offline. (Conceptual)
    *   Full offline CRUD capabilities with background sync. (Conceptual - More Complex)
*   **Community (Optional & Cautious):**
    *   If aligned with the app's core ethos of individual reflection, potentially an anonymous way to share gratitude counts or streaks (highly privacy-focused). (Very Conceptual)
*   **Analytics & Growth:**
    *   More detailed analytics for A/B testing minor UI/UX changes. (Conceptual)
*   **Localization:**
    *   Expanded localization to other languages if a broader user base is targeted. (Conceptual)

## 7. Technology Evolution

We will continue to monitor developments in the React Native, Expo, and Supabase ecosystems. The technology stack will be kept up-to-date by regularly upgrading dependencies, adopting new best practices, and refactoring code as needed to ensure performance, security, and maintainability.

This roadmap is a living document and will be updated as the Yeşer app evolves.
