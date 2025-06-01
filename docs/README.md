# Yeşer Project Documentation

Welcome to the comprehensive documentation for the Yeşer mobile application. Yeşer is a minimalist gratitude journaling app built with React Native (Expo) and Supabase, designed to help users cultivate a consistent gratitude practice.

The app's primary language is Turkish, while all development, code, and documentation are maintained in English for clarity and broader collaboration.

This directory contains all technical, strategic, and operational documents related to the project.

## Documents Overview

Below is a list of key documents available in this directory, outlining various aspects of the Yeşer project:

*   **[Executive Summary](./executive-summary.md):** A high-level overview of the project, its objectives, target audience (Ayşe, The Peace-Seeking Millennial), and core value proposition.
*   **[Scoping & Design](./scoping-design.md):** Details the application's scope, design principles, user personas, user stories, and key UI/UX considerations.
*   **[Architecture & Technical Strategy](./architecture-technical-strategy.md):** Describes the chosen technology stack (React Native, Expo, Supabase, Zustand, etc.), architectural patterns, and the recommended folder structure.
*   **[Backend & Database Setup](./backend-database-setup.md):** Outlines the Supabase backend configuration, including database schema for `profiles` and `gratitude_entries`, Row Level Security (RLS) policies, database triggers (e.g., `handle_new_user`), and Remote Procedure Calls (RPCs) like `calculate_streak`.
*   **[Security & Secrets Management](./security-secrets-management.md):** Covers security measures implemented, handling of API keys (Supabase URL & Anon Key), OAuth configurations, and data privacy considerations.
*   **[Firebase Analytics Integration](./FIREBASE_ANALYTICS_INTEGRATION.md):** Details the setup and integration of Google Analytics 4 (GA4) using `@react-native-firebase/analytics`, including the event tracking strategy and the role of `analyticsService.ts`.
*   **[Testing & Quality Assurance](./testing-quality-assurance.md):** Explains the testing strategy, encompassing unit tests (Jest), component tests (React Native Testing Library), and End-to-End (E2E) testing plans, along with overall QA processes.
*   **[CI/CD & Deployment](./ci-cd-deployment.md):** Describes the Continuous Integration/Continuous Deployment (CI/CD) pipeline established using GitHub Actions and Expo Application Services (EAS) for builds, updates, and store submissions.
*   **[Phased Implementation Roadmap](./phased-implementation-roadmap.md):** Provides a breakdown of features across different development phases (Phase 0, 1, 2, 3), current project status, and future plans.
*   **[Post-Launch Monitoring & Maintenance](./post-launch-monitoring-maintenance.md):** Outlines strategies for monitoring application performance, gathering user feedback, and planning ongoing maintenance and updates post-launch.

Please refer to the individual documents for detailed information on each topic.
