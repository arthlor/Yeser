# 08: Development Workflow & Standards

A high-quality application is built on a foundation of high-quality code and consistent processes. This document outlines the standards, tools, and workflows for developing Yeşer.

## 1. Guiding Philosophy: Performance & Quality

Our coding standards are not arbitrary; they are derived from a core philosophy focused on performance, readability, and maintainability. These rules are strictly enforced to prevent the performance issues, bundle bloat, and bugs that were solved during the app's initial optimization phase.

**See**: [The full coding standards document.](../05-development.md) _(Note: This links to the existing detailed document, which remains the single source of truth for all rules)._

### The "Big Five" Mandatory Rules

1.  **Zero `any` types**: All new code must be strictly typed.
2.  **No Inline Styles**: All styles must be created with `StyleSheet.create` and use theme variables.
3.  **Complete Hook Dependencies**: The `exhaustive-deps` ESLint rule is set to `error`. There are no exceptions.
4.  **No Unused Imports/Variables**: Keep the codebase clean and the bundle size small.
5.  **Use Performance Hooks**: Use `React.memo`, `useCallback`, and `useMemo` where appropriate to prevent unnecessary re-renders.

## 2. Tools & Setup

- **Editor**: Visual Studio Code.
- **Formatting**: Prettier is configured to format on save.
- **Linting**: ESLint is configured to identify issues and enforce standards. Key plugins include `@typescript-eslint`, `react-hooks`, and `react-native`.
- **Type Checking**: The TypeScript compiler (`tsc`) is used to ensure the entire project is type-safe.

## 3. Git Workflow: Git Flow

We use a simplified version of the Git Flow branching model.

- `main`: The production branch. It is always stable and deployable. Direct commits are forbidden.
- `develop`: The primary development branch. All feature branches are created from `develop`.
- **Feature Branches**: `feature/<feature-name>` (e.g., `feature/advanced-analytics`). All work is done on feature branches.
- **Bugfix Branches**: `bugfix/<issue-description>`.
- **Hotfix Branches**: `hotfix/<critical-issue>`. Created from `main` for urgent production fixes.

### The Workflow

1.  Create a feature branch from `develop`: `git checkout develop && git pull && git checkout -b feature/my-new-feature`.
2.  Work on the feature, making small, atomic commits.
3.  Commit messages must follow the **Conventional Commits** specification (e.g., `feat(auth): add google sign-in button`).
4.  Once the feature is complete and passes all local checks (linting, type checking), push the branch to the remote.
5.  Open a Pull Request (PR) from the feature branch into `develop`.
6.  The PR must be reviewed by at least one other team member.
7.  Automated CI checks must pass.
8.  Once approved, the PR is squashed and merged into `develop`.

## 4. Project Structure

The codebase is organized by feature in the `src/features` directory. This makes the project easy to navigate and promotes modularity.

```
src/
├── api/          # Supabase API wrappers
├── features/     # Feature-based modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── screens/
│   └── gratitude/
│       ├── ...
├── providers/    # Global context providers
├── services/     # Business logic (notifications, etc.)
├── shared/       # Reusable components and hooks
├── store/        # Zustand client state stores
├── themes/       # Theme definitions
└── utils/        # Utility functions
```

This structure, combined with our strict standards and workflows, ensures that Yeşer remains a high-quality, performant, and maintainable application as it continues to evolve.
