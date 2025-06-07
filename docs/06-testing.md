# Testing Guide

This document provides comprehensive testing strategies for the Yeser gratitude app, focusing on the modern hybrid architecture with TanStack Query and Zustand.

## 🧪 Testing Architecture Overview

The testing strategy covers multiple layers of the application:

```
┌─────────────────────────────────────────────────────────┐
│                    E2E TESTING                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Detox     │  │  Critical   │  │  User       │     │
│  │   Tests     │  │  Journeys   │  │  Flows      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 INTEGRATION TESTING                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Component  │  │    Hook     │  │    Query    │     │
│  │    Tests    │  │Integration  │  │ Interaction │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                   UNIT TESTING                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │TanStack Qry │  │  Zustand    │  │ Components  │     │
│  │   Hooks     │  │   Stores    │  │ (Isolated)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    API TESTING                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │     MSW     │  │  Supabase   │  │    Mock     │     │
│  │   Mocking   │  │   Client    │  │ Functions   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Testing Setup

### Dependencies

```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/jest-native": "^5.4.0",
    "@testing-library/react-hooks": "^8.0.1",
    "jest": "^29.0.0",
    "msw": "^2.0.0",
    "msw/native": "^2.0.0"
  }
}
```

### Jest Configuration

```javascript
// jest.config.cjs
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@expo|@tanstack/react-query|expo|expo-*|@unimodules/.*|.*expo.*)',
  ],
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Test Setup

```typescript
// jest-setup.ts
import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';
import { server } from './src/__mocks__/server';

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key',
    },
  },
}));

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## 🔌 Testing TanStack Query Hooks

### Query Hooks Testing

```typescript
// src/hooks/__tests__/useUserProfile.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserProfile } from '../useUserProfile';
import { mockProfile } from '../../__mocks__/mockData';

// Test wrapper with QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUserProfile', () => {
  it('should fetch user profile on mount', async () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(() => useUserProfile(), { wrapper });
    
    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.profile).toBe(null);
    
    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.error).toBe(null);
  });
  
  it('should handle error states', async () => {
    // Mock API error
    server.use(
      rest.post('*/rpc/get_profile', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: { message: 'Profile not found' } })
        );
      })
    );
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUserProfile(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.profile).toBe(null);
  });
  
  it('should not fetch when user is not authenticated', () => {
    // Mock unauthenticated state
    jest.mock('../../store/authStore', () => ({
      useAuthStore: () => ({ user: null }),
    }));
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUserProfile(), { wrapper });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.profile).toBe(null);
  });
});
```

### Mutation Hooks Testing

```typescript
// src/hooks/__tests__/useGratitudeMutations.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGratitudeMutations } from '../useGratitudeMutations';
import { useGratitudeEntry } from '../useGratitudeQueries';

describe('useGratitudeMutations', () => {
  let queryClient: QueryClient;
  let wrapper: React.ComponentType<{ children: React.ReactNode }>;
  
  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  it('should add statement with optimistic update', async () => {
    const entryDate = '2024-01-15';
    const newStatement = 'Test gratitude statement';
    
    // First, set up existing entry data
    const { result: entryResult } = renderHook(
      () => useGratitudeEntry(entryDate),
      { wrapper }
    );
    
    // Wait for initial data
    await waitFor(() => {
      expect(entryResult.current.isLoading).toBe(false);
    });
    
    // Now test the mutation
    const { result: mutationResult } = renderHook(
      () => useGratitudeMutations(),
      { wrapper }
    );
    
    // Perform mutation
    act(() => {
      mutationResult.current.addStatement({
        entryDate,
        statement: newStatement,
      });
    });
    
    // Check optimistic update
    expect(mutationResult.current.isAddingStatement).toBe(true);
    
    // Check that the UI was optimistically updated
    const updatedEntry = queryClient.getQueryData(['gratitudeEntry', entryDate]);
    expect(updatedEntry?.statements).toContain(newStatement);
    
    // Wait for mutation to complete
    await waitFor(() => {
      expect(mutationResult.current.isAddingStatement).toBe(false);
    });
  });
  
  it('should rollback optimistic update on error', async () => {
    const entryDate = '2024-01-15';
    const newStatement = 'Test statement';
    
    // Mock API error
    server.use(
      rest.post('*/rpc/add_gratitude_statement', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: { message: 'Database error' } })
        );
      })
    );
    
    const { result } = renderHook(() => useGratitudeMutations(), { wrapper });
    
    // Get initial state
    const initialEntry = queryClient.getQueryData(['gratitudeEntry', entryDate]);
    
    // Perform mutation
    act(() => {
      result.current.addStatement({ entryDate, statement: newStatement });
    });
    
    // Wait for mutation to fail
    await waitFor(() => {
      expect(result.current.isAddingStatement).toBe(false);
    });
    
    // Check that optimistic update was rolled back
    const finalEntry = queryClient.getQueryData(['gratitudeEntry', entryDate]);
    expect(finalEntry).toEqual(initialEntry);
  });
});
```

### Query Invalidation Testing

```typescript
// src/hooks/__tests__/queryInvalidation.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';

describe('Query Invalidation', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  it('should invalidate related queries after adding statement', async () => {
    const userId = 'user-123';
    const entryDate = '2024-01-15';
    
    // Set up spies
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    
    const { result } = renderHook(
      () => useGratitudeMutations(),
      { wrapper: createWrapper() }
    );
    
    // Perform mutation
    act(() => {
      result.current.addStatement({
        entryDate,
        statement: 'Test statement',
      });
    });
    
    await waitFor(() => {
      expect(result.current.isAddingStatement).toBe(false);
    });
    
    // Check that correct queries were invalidated
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.gratitudeEntry(userId, entryDate),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.gratitudeEntries(userId),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.streaks(userId),
    });
  });
});
```

## 🏪 Testing Zustand Stores

### Auth Store Testing

```typescript
// src/store/__tests__/authStore.test.ts
import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';

// Mock auth service
jest.mock('../../services/authService', () => ({
  signInWithEmail: jest.fn(),
  signOut: jest.fn(),
  getCurrentSession: jest.fn(),
  onAuthStateChange: jest.fn(),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isLoading: true,
      error: null,
    });
  });

  it('should handle login correctly', async () => {
    const { result } = renderHook(() => useAuthStore());
    
    const credentials = {
      email: 'test@example.com',
      password: 'password123',
    };
    
    // Mock successful login
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    require('../../services/authService').signInWithEmail.mockResolvedValue({
      user: mockUser,
    });
    
    await act(async () => {
      await result.current.loginWithEmail(credentials);
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBe(null);
  });
  
  it('should handle login error', async () => {
    const { result } = renderHook(() => useAuthStore());
    
    const credentials = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };
    
    // Mock login error
    require('../../services/authService').signInWithEmail.mockRejectedValue(
      new Error('Invalid credentials')
    );
    
    await act(async () => {
      await result.current.loginWithEmail(credentials);
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.error).toBe('Invalid credentials');
  });
  
  it('should handle logout', async () => {
    const { result } = renderHook(() => useAuthStore());
    
    // Set authenticated state
    act(() => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: { id: 'user-123', email: 'test@example.com' },
      });
    });
    
    await act(async () => {
      await result.current.logout();
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
  });
});
```

### Theme Store Testing

```typescript
// src/store/__tests__/themeStore.test.ts
import { act, renderHook } from '@testing-library/react-native';
import { useThemeStore } from '../themeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reset store state
    useThemeStore.setState({
      activeThemeName: 'light',
      activeTheme: lightTheme,
    });
  });

  it('should set theme correctly', () => {
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.activeThemeName).toBe('dark');
    expect(result.current.activeTheme).toEqual(darkTheme);
  });
  
  it('should toggle theme', () => {
    const { result } = renderHook(() => useThemeStore());
    
    // Start with light theme
    expect(result.current.activeThemeName).toBe('light');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.activeThemeName).toBe('dark');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.activeThemeName).toBe('light');
  });
});
```

## 🧩 Component Testing

### Testing Components with TanStack Query

```typescript
// src/components/__tests__/GratitudeEntryForm.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GratitudeEntryForm } from '../GratitudeEntryForm';

const createTestWrapper = () => {
  const queryClient = createTestQueryClient();
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('GratitudeEntryForm', () => {
  it('should submit statement successfully', async () => {
    const Wrapper = createTestWrapper();
    
    const { getByTestId } = render(
      <Wrapper>
        <GratitudeEntryForm entryDate="2024-01-15" />
      </Wrapper>
    );
    
    const input = getByTestId('statement-input');
    const submitButton = getByTestId('submit-button');
    
    // Type statement
    fireEvent.changeText(input, 'I am grateful for testing');
    
    // Submit form
    fireEvent.press(submitButton);
    
    // Check loading state
    expect(getByTestId('loading-indicator')).toBeTruthy();
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(getByTestId('success-message')).toBeTruthy();
    });
  });
  
  it('should show error message on submission failure', async () => {
    // Mock API error
    server.use(
      rest.post('*/rpc/add_gratitude_statement', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: { message: 'Network error' } }));
      })
    );
    
    const Wrapper = createTestWrapper();
    
    const { getByTestId } = render(
      <Wrapper>
        <GratitudeEntryForm entryDate="2024-01-15" />
      </Wrapper>
    );
    
    const input = getByTestId('statement-input');
    const submitButton = getByTestId('submit-button');
    
    fireEvent.changeText(input, 'Test statement');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy();
    });
  });
  
  it('should disable input during submission', async () => {
    const Wrapper = createTestWrapper();
    
    const { getByTestId } = render(
      <Wrapper>
        <GratitudeEntryForm entryDate="2024-01-15" />
      </Wrapper>
    );
    
    const input = getByTestId('statement-input');
    const submitButton = getByTestId('submit-button');
    
    fireEvent.changeText(input, 'Test statement');
    fireEvent.press(submitButton);
    
    // During submission, form should be disabled
    expect(submitButton.props.disabled).toBe(true);
    
    await waitFor(() => {
      expect(submitButton.props.disabled).toBe(false);
    });
  });
});
```

### Testing Components with Zustand

```typescript
// src/components/__tests__/ThemeToggle.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeToggle } from '../ThemeToggle';
import { useThemeStore } from '../../store/themeStore';

jest.mock('../../store/themeStore');

describe('ThemeToggle', () => {
  const mockToggleTheme = jest.fn();
  
  beforeEach(() => {
    (useThemeStore as jest.Mock).mockReturnValue({
      activeThemeName: 'light',
      toggleTheme: mockToggleTheme,
    });
  });

  it('should toggle theme when pressed', () => {
    const { getByTestId } = render(<ThemeToggle />);
    
    const toggleButton = getByTestId('theme-toggle');
    
    fireEvent.press(toggleButton);
    
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
  
  it('should display current theme', () => {
    const { getByText } = render(<ThemeToggle />);
    
    expect(getByText('Light Theme')).toBeTruthy();
  });
});
```

## 🔄 Integration Testing

### Testing Hook + Component Integration

```typescript
// src/components/__tests__/HomeScreen.integration.test.ts
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeScreen } from '../HomeScreen';
import { mockProfile, mockEntry, mockStreak } from '../../__mocks__/mockData';

describe('HomeScreen Integration', () => {
  it('should load and display all data correctly', async () => {
    const queryClient = createTestQueryClient();
    
    const { getByTestId, getByText } = render(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    
    // Check loading state
    expect(getByTestId('loading-indicator')).toBeTruthy();
    
    // Wait for data to load
    await waitFor(() => {
      expect(getByText(`Welcome, ${mockProfile.username}!`)).toBeTruthy();
    });
    
    // Check that all data is displayed
    expect(getByText(`Current Streak: ${mockStreak.current_streak}`)).toBeTruthy();
    expect(getByText('Today\'s Gratitude')).toBeTruthy();
    
    // Check that today's statements are displayed
    mockEntry.statements.forEach(statement => {
      expect(getByText(statement)).toBeTruthy();
    });
  });
  
  it('should handle error states gracefully', async () => {
    // Mock API errors
    server.use(
      rest.post('*/rpc/get_profile', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: { message: 'Profile error' } }));
      })
    );
    
    const queryClient = createTestQueryClient();
    
    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(getByTestId('error-state')).toBeTruthy();
    });
  });
});
```

### Testing Cross-Store Communication

```typitten
// src/__tests__/authProfileIntegration.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useUserProfile } from '../hooks/useUserProfile';

describe('Auth + Profile Integration', () => {
  it('should fetch profile when user logs in', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result: authResult } = renderHook(() => useAuthStore());
    const { result: profileResult } = renderHook(() => useUserProfile(), { wrapper });
    
    // Initially no user, no profile query
    expect(authResult.current.user).toBe(null);
    expect(profileResult.current.isLoading).toBe(false);
    expect(profileResult.current.profile).toBe(null);
    
    // Mock successful login
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    require('../services/authService').signInWithEmail.mockResolvedValue({
      user: mockUser,
    });
    
    // Login
    await act(async () => {
      await authResult.current.loginWithEmail({
        email: 'test@example.com',
        password: 'password',
      });
    });
    
    // User should be authenticated
    expect(authResult.current.isAuthenticated).toBe(true);
    expect(authResult.current.user).toEqual(mockUser);
    
    // Profile query should now be enabled and loading
    await waitFor(() => {
      expect(profileResult.current.isLoading).toBe(true);
    });
    
    // Profile should load
    await waitFor(() => {
      expect(profileResult.current.profile).toBeTruthy();
    });
  });
  
  it('should clear queries when user logs out', async () => {
    const queryClient = createTestQueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');
    
    const { result } = renderHook(() => useAuthStore());
    
    // Set authenticated state
    act(() => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: { id: 'user-123', email: 'test@example.com' },
      });
    });
    
    // Logout
    await act(async () => {
      await result.current.logout();
    });
    
    // Query cache should be cleared
    expect(clearSpy).toHaveBeenCalled();
  });
});
```

## 🎭 Mock Service Worker (MSW) Setup

### API Mocking

```typescript
// src/__mocks__/server.ts
import { setupServer } from 'msw/native';
import { rest } from 'msw';
import { mockProfile, mockEntries, mockStreak } from './mockData';

export const handlers = [
  // Profile API
  rest.post('*/rpc/get_profile', (req, res, ctx) => {
    return res(ctx.json(mockProfile));
  }),
  
  rest.post('*/rpc/update_profile', (req, res, ctx) => {
    const updates = req.body as Partial<Profile>;
    return res(ctx.json({ ...mockProfile, ...updates }));
  }),
  
  // Gratitude API
  rest.post('*/rpc/get_gratitude_entry_by_date', (req, res, ctx) => {
    const { entry_date } = req.body as { entry_date: string };
    const entry = mockEntries.find(e => e.entry_date === entry_date);
    return res(ctx.json(entry || null));
  }),
  
  rest.post('*/rpc/add_gratitude_statement', (req, res, ctx) => {
    const { entry_date, statement_text } = req.body as { 
      entry_date: string; 
      statement_text: string; 
    };
    
    const existingEntry = mockEntries.find(e => e.entry_date === entry_date);
    
    if (existingEntry) {
      const updatedEntry = {
        ...existingEntry,
        statements: [...existingEntry.statements, statement_text],
      };
      return res(ctx.json(updatedEntry));
    } else {
      const newEntry = {
        id: `entry-${Date.now()}`,
        user_id: 'user-123',
        entry_date,
        statements: [statement_text],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return res(ctx.json(newEntry));
    }
  }),
  
  // Streak API
  rest.post('*/rpc/get_user_streak', (req, res, ctx) => {
    return res(ctx.json(mockStreak));
  }),
  
  // Error handlers for testing error states
  rest.post('*/rpc/get_profile_error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: { message: 'Profile not found' } })
    );
  }),
];

export const server = setupServer(...handlers);
```

### Mock Data

```typescript
// src/__mocks__/mockData.ts
export const mockProfile: Profile = {
  id: 'profile-123',
  username: 'Test User',
  onboarded: true,
  reminder_enabled: true,
  reminder_time: '09:00',
  throwback_reminder_enabled: false,
  throwback_reminder_frequency: 'weekly',
  daily_gratitude_goal: 3,
  useVariedPrompts: true,
};

export const mockEntries: GratitudeEntry[] = [
  {
    id: 'entry-1',
    user_id: 'user-123',
    entry_date: '2024-01-15',
    statements: [
      'I am grateful for my family',
      'I am grateful for good health',
      'I am grateful for this beautiful day',
    ],
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z',
  },
];

export const mockStreak: Streak = {
  current_streak: 7,
  longest_streak: 21,
  last_entry_date: '2024-01-15',
};
```

## 🚀 Performance Testing

### Query Performance Testing

```typescript
// src/__tests__/performance/queryPerformance.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGratitudeEntries } from '../../hooks/useGratitudeQueries';

describe('Query Performance', () => {
  it('should cache query results efficiently', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    // Track network requests
    let requestCount = 0;
    server.use(
      rest.post('*/rpc/get_all_gratitude_entries', (req, res, ctx) => {
        requestCount++;
        return res(ctx.json(mockEntries));
      })
    );
    
    // First render - should make network request
    const { result: result1 } = renderHook(() => useGratitudeEntries(), { wrapper });
    
    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });
    
    expect(requestCount).toBe(1);
    
    // Second render - should use cache
    const { result: result2 } = renderHook(() => useGratitudeEntries(), { wrapper });
    
    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });
    
    // Should not make another network request
    expect(requestCount).toBe(1);
    
    // Both should have same data
    expect(result1.current.data).toEqual(result2.current.data);
  });
  
  it('should handle large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      ...mockEntries[0],
      id: `entry-${i}`,
      entry_date: `2024-01-${(i % 30) + 1}`,
    }));
    
    server.use(
      rest.post('*/rpc/get_all_gratitude_entries', (req, res, ctx) => {
        return res(ctx.json(largeDataset));
      })
    );
    
    const start = performance.now();
    
    const { result } = renderHook(() => useGratitudeEntries(), { 
      wrapper: createWrapper() 
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    const end = performance.now();
    const duration = end - start;
    
    // Should load large dataset in reasonable time
    expect(duration).toBeLessThan(2000); // 2 seconds
    expect(result.current.data).toHaveLength(1000);
  });
});
```

## 🏃‍♂️ E2E Testing

### Critical User Journeys

```typescript
// e2e/criticalJourneys.e2e.js
describe('Critical User Journeys', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete full gratitude entry flow', async () => {
    // Login
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    
    // Wait for home screen
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Navigate to daily entry
    await element(by.id('daily-entry-tab')).tap();
    
    // Add gratitude statement
    await element(by.id('statement-input')).typeText('I am grateful for automated testing');
    await element(by.id('add-statement-button')).tap();
    
    // Verify statement was added
    await waitFor(element(by.text('I am grateful for automated testing')))
      .toBeVisible()
      .withTimeout(3000);
    
    // Check streak was updated
    await element(by.id('home-tab')).tap();
    await waitFor(element(by.id('streak-counter')))
      .toBeVisible()
      .withTimeout(3000);
  });
  
  it('should handle offline scenarios', async () => {
    // Enable airplane mode
    await device.setURLBlacklist(['.*']);
    
    // Try to add statement while offline
    await element(by.id('daily-entry-tab')).tap();
    await element(by.id('statement-input')).typeText('Offline gratitude');
    await element(by.id('add-statement-button')).tap();
    
    // Should show optimistic update
    await waitFor(element(by.text('Offline gratitude')))
      .toBeVisible()
      .withTimeout(1000);
    
    // Disable airplane mode
    await device.setURLBlacklist([]);
    
    // Should sync when back online
    await waitFor(element(by.id('sync-indicator')))
      .not.toBeVisible()
      .withTimeout(5000);
  });
});
```

## 📊 Coverage and Quality

### Coverage Configuration

```javascript
// jest.config.cjs - coverage section
module.exports = {
  // ... other config
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/types/**',
    '!src/**/constants/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific thresholds for critical areas
    './src/hooks/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/store/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
```

### Quality Gates

```bash
# package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --watchAll=false",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "detox test",
    "test:performance": "jest --testPathPattern=performance"
  }
}
```

## 🔮 Advanced Testing Patterns

### Testing Real-time Features

```typescript
// Testing Supabase realtime + TanStack Query integration
it('should update cache when realtime event occurs', async () => {
  const queryClient = createTestQueryClient();
  
  // Mock realtime subscription
  const mockSubscription = {
    unsubscribe: jest.fn(),
  };
  
  const mockSupabase = {
    from: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => mockSubscription),
      })),
    })),
  };
  
  // Test that cache is invalidated on realtime event
  const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
  
  // Simulate realtime event
  const realtimeCallback = jest.fn();
  mockSupabase.from().on().subscribe.mockImplementation((callback) => {
    realtimeCallback = callback;
    return mockSubscription;
  });
  
  // Trigger realtime event
  realtimeCallback({
    eventType: 'UPDATE',
    new: { id: 'entry-1', statements: ['Updated statement'] },
  });
  
  expect(invalidateQueriesSpy).toHaveBeenCalled();
});
```

### Testing Error Boundaries

```typescript
// Testing error recovery and fallback states
it('should show error boundary when query fails catastrophically', async () => {
  const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
    const [hasError, setHasError] = React.useState(false);
    
    if (hasError) {
      return <Text testID="error-boundary">Something went wrong</Text>;
    }
    
    return <>{children}</>;
  };
  
  // Mock catastrophic failure
  server.use(
    rest.post('*/rpc/get_profile', (req, res, ctx) => {
      return res(ctx.networkError('Network completely failed'));
    })
  );
  
  const { getByTestId } = render(
    <ErrorBoundary>
      <QueryClientProvider client={createTestQueryClient()}>
        <HomeScreen />
      </QueryClientProvider>
    </ErrorBoundary>
  );
  
  await waitFor(() => {
    expect(getByTestId('error-boundary')).toBeTruthy();
  });
});
```

---

This comprehensive testing guide provides patterns and strategies for thoroughly testing the modern TanStack Query + Zustand architecture, ensuring reliability, performance, and maintainability of the Yeser gratitude app. 
This comprehensive testing guide provides all the tools and practices needed to maintain high-quality, reliable code in the Yeser gratitude app through effective testing strategies. 