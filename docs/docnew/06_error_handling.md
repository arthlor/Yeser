# 06: 7-Layer Error Protection System

A core principle of Yeşer is to provide a seamless and professional user experience. A key part of this is ensuring that users **never** see a technical, cryptic error message. The 7-Layer Error Protection system is an enterprise-grade strategy to catch, log, and gracefully handle every possible error.

## The Goal

- **User Experience**: The user should only ever see simple, helpful, Turkish-language messages (e.g., "İnternet bağlantınızı kontrol edin."). User-caused errors (e.g., invalid email format) should show inline validation, while system errors should show a generic, friendly message.
- **Developer Experience**: Developers must have access to the full, detailed technical error for debugging purposes.

## The 7 Layers of Protection

```mermaid
graph TD
    subgraph User-Facing
        A[UI Components]
    end
    subgraph Application Code
        B[Error Boundary]
        C[Global Error Provider]
    end
    subgraph State & API
        D[TanStack Query]
        E[API Wrappers]
        F[Auth & Services]
    end
    subgraph Backend
        G[Supabase (RLS & RPCs)]
    end

    A -- Catches render errors --> B
    B -- Shows fallback UI --> A
    C -- Provides error display hooks --> A
    D -- Catches async errors --> C
    E -- Standardizes errors --> D
    F -- Catches service errors --> E
    G -- Enforces data integrity --> F
```

**1. Layer 7: UI Component Safety**

- **Where**: Inside React components.
- **How**: Before displaying data from an API, we perform final safety checks (e.g., `if (!data) return <EmptyState />;`). Hooks like `useGlobalError` are used to display toast notifications for errors caught by lower layers.

**2. Layer 6: React Error Boundary**

- **Where**: Wrapped around major sections of the app, like the main navigator.
- **How**: A class-based React component with `componentDidCatch`. If a component deep in the tree throws a rendering error, the boundary catches it, logs the error, and displays a generic fallback UI instead of a white screen of death.

**3. Layer 5: Global Error Provider**

- **Where**: A React context provider (`ErrorProvider.tsx`) wrapping the entire app.
- **How**: It provides a global hook, `useGlobalError`, that any component can use to trigger user-facing error notifications (toasts). It's the centralized system for _displaying_ errors to the user.

**4. Layer 4: TanStack Query**

- **Where**: In all `useQuery` and `useMutation` hooks.
- **How**: TanStack Query has built-in `error` states. We have a global `onError` handler in our query client configuration that logs the error. Additionally, individual hooks can use the `error` object to show context-specific fallbacks. For mutations, `onError` is used to roll back optimistic updates.

**5. Layer 3: API Wrappers (`/src/api`)**

- **Where**: In files like `gratitudeApi.ts`.
- **How**: This is the first line of defense for backend errors. All calls to the Supabase client are wrapped in a `try/catch` block. If an error occurs, it is caught, logged, and then re-thrown as a standardized `Error` object. This ensures TanStack Query receives a consistent error format.

**6. Layer 2: Services (`/src/services`)**

- **Where**: In files like `authService.ts` and `notificationService.ts`.
- **How**: Similar to the API layer, any potentially failing operation (e.g., interacting with device permissions, deep link handling) is wrapped in a `try/catch` block to ensure failures are handled gracefully.

**7. Layer 1: Supabase Backend**

- **Where**: In the PostgreSQL database itself.
- **How**:
  - **RLS Policies**: Prevent unauthorized data access before a query even runs.
  - **Constraints**: `NOT NULL`, `CHECK`, and `UNIQUE` constraints prevent invalid data from ever being saved.
  - **RPC Functions**: Our stored procedures contain their own internal error handling to manage transactional integrity.

### The Flow of a Network Error

1.  User tries to add a statement while offline.
2.  `gratitudeApi.ts` attempts to call the Supabase RPC. The Supabase client throws a network error.
3.  The `try/catch` block in our API wrapper **(Layer 3)** catches it, logs the technical detail, and re-throws a standard `Error`.
4.  The `useAddStatement` mutation in TanStack Query **(Layer 4)** catches the error. It triggers its `onError` callback.
5.  The optimistic update is automatically rolled back, removing the statement from the UI.
6.  The component rendering the list sees the `isError` flag from the mutation hook.
7.  It calls `showError("İnternet bağlantınızı kontrol edin.")` from the `useGlobalError` hook **(Layer 5)**.
8.  A user-friendly toast notification appears **(Layer 7)**.

The user sees a simple, helpful message, and the developer has a clear log of the underlying network failure.

### Error Translation in Practice

A key component of this system is the `safeErrorDisplay` utility. It ensures that no matter what error is thrown, we can produce a safe, translated message.

```typescript
// A simplified example of the error translation utility

function safeErrorDisplay(error: unknown): string {
  const defaultMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';

  if (error instanceof Error) {
    // Handle Supabase auth errors
    if (error.message.includes('Invalid login credentials')) {
      return 'E-posta veya şifre hatalı.';
    }
    // Handle Supabase network errors
    if (error.message.includes('fetch failed')) {
      return 'İnternet bağlantınızı kontrol edin.';
    }
    // Handle RLS or other database errors
    if (error.message.includes('permission denied')) {
      // Log the serious security issue for developers
      logger.error('CRITICAL: RLS VIOLATION', { originalError: error });
      // But show the user a generic message
      return defaultMessage;
    }
  }

  // Fallback for any other error type
  return defaultMessage;
}
```

This utility acts as a gatekeeper, ensuring that technical details are logged but never displayed, fulfilling the two primary goals of our error handling strategy.
