# Testing Guide

This document provides comprehensive testing strategies and patterns for the Yeser gratitude app, with special focus on TanStack Query integration and React Native testing best practices.

## 🧪 Testing Strategy Overview

The Yeser app follows a **modern testing pyramid** approach optimized for TanStack Query and React Native:

```
┌─────────────────────────────────────────────────────────┐
│                    E2E TESTS                            │
│               Critical User Journeys                    │
│                     (Detox)                             │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 INTEGRATION TESTS                       │
│            Hook + Component Integration                 │
│              TanStack Query Flows                       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                   UNIT TESTS                            │
│        Components, Hooks, Utilities, API Layer         │
│               React Testing Library                     │
└─────────────────────────────────────────────────────────┘
```

### Testing Principles

- ✅ **Test Behavior, Not Implementation**: Focus on what users see and do
- ✅ **Mock External Dependencies**: Supabase, Firebase, device APIs
- ✅ **TanStack Query Testing**: Proper query/mutation testing patterns
- ✅ **Accessibility Testing**: Ensure app works for all users
- ✅ **Performance Testing**: Monitor query performance and rendering

## 🛠️ Testing Setup

### Jest Configuration

```javascript
// jest.config.cjs
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@tanstack/react-query)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts', '@testing-library/jest-native/extend-expect'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**/*',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'jsdom',
};
```

### Test Setup File

```typescript
// jest-setup.ts
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo modules
jest.mock('expo-notifications', () => ({
  getDefaultNotificationChannel: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

// Mock Haptic Feedback
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

// Silence console warnings in tests
global.console.warn = jest.fn();
global.console.error = jest.fn();

// Setup TanStack Query testing
import { QueryClient } from '@tanstack/react-query';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
```

## 🔐 Authentication Testing

### Magic Link Authentication Testing

The authentication system requires special testing considerations due to the asynchronous nature of magic links and deep link handling.

#### Auth Service Testing

```typescript
// __tests__/services/authService.test.ts
import { authService } from '@/features/auth/services/authService';
import { supabase } from '@/services/supabase';

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithMagicLink', () => {
    it('should send magic link successfully', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      const result = await authService.signInWithMagicLink('test@example.com');

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'yeser://auth/callback',
          data: {
            source: 'yeser_app',
          },
        },
      });
    });

    it('should handle magic link errors', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Rate limit exceeded' },
      });

      const result = await authService.signInWithMagicLink('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should validate email format', async () => {
      const result = await authService.signInWithMagicLink('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Geçerli bir email adresi girin');
    });
  });

  describe('signInWithGoogle', () => {
    it('should handle Google OAuth', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { provider: 'google', url: 'https://oauth.url' },
        error: null,
      });

      const result = await authService.signInWithGoogle();

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'yeser://auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    });
  });
});
```

#### Deep Link Handler Testing

```typescript
// __tests__/components/DeepLinkHandler.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { DeepLinkHandler } from '@/features/auth/components/DeepLinkHandler';
import { useAuthStore } from '@/store/authStore';

// Mock React Native Linking
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    getInitialURL: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

// Mock auth store
jest.mock('@/store/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('DeepLinkHandler', () => {
  const mockSetSession = jest.fn();
  const mockSetIsLoading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      setSession: mockSetSession,
      setIsLoading: mockSetIsLoading,
      // ... other auth store properties
    });
  });

  it('should handle initial URL with auth tokens', async () => {
    const mockUrl = 'yeser://auth/callback?access_token=test&refresh_token=test';
    (Linking.getInitialURL as jest.Mock).mockResolvedValueOnce(mockUrl);

    render(<DeepLinkHandler />);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
  });

  it('should handle URL changes during app lifecycle', () => {
    let urlListener: (url: string) => void;

    (Linking.addEventListener as jest.Mock).mockImplementationOnce((event, callback) => {
      if (event === 'url') {
        urlListener = callback;
      }
      return { remove: jest.fn() };
    });

    render(<DeepLinkHandler />);

    // Simulate URL change
    const testUrl = 'yeser://auth/callback?access_token=new_token';
    urlListener(testUrl);

    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
  });

  it('should handle malformed URLs gracefully', async () => {
    const mockUrl = 'invalid-url';
    (Linking.getInitialURL as jest.Mock).mockResolvedValueOnce(mockUrl);

    render(<DeepLinkHandler />);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    // Should not set session for invalid URLs
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
```

#### Login Screen Testing

```typescript
// __tests__/screens/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { authService } from '@/features/auth/services/authService';

// Mock auth service
jest.mock('@/features/auth/services/authService');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    const { getByLabelText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    expect(getByLabelText('Email Adresi')).toBeTruthy();
    expect(getByText('Giriş Bağlantısı Gönder')).toBeTruthy();
    expect(getByText('Google ile Giriş Yap')).toBeTruthy();
  });

  it('should validate email input', async () => {
    const { getByLabelText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByLabelText('Email Adresi');
    const submitButton = getByText('Giriş Bağlantısı Gönder');

    // Test empty email
    fireEvent.press(submitButton);
    await waitFor(() => {
      expect(getByText('Lütfen email adresinizi girin')).toBeTruthy();
    });

    // Test invalid email
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(submitButton);
    await waitFor(() => {
      expect(getByText('Geçerli bir email adresi girin')).toBeTruthy();
    });
  });

  it('should handle successful magic link sending', async () => {
    mockAuthService.signInWithMagicLink.mockResolvedValueOnce({
      success: true,
      error: null,
    });

    const { getByLabelText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByLabelText('Email Adresi');
    const submitButton = getByText('Giriş Bağlantısı Gönder');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Giriş bağlantısı email adresinize gönderildi!')).toBeTruthy();
    });

    expect(mockAuthService.signInWithMagicLink).toHaveBeenCalledWith('test@example.com');
  });

  it('should handle magic link errors', async () => {
    mockAuthService.signInWithMagicLink.mockResolvedValueOnce({
      success: false,
      error: 'Rate limit exceeded',
    });

    const { getByLabelText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByLabelText('Email Adresi');
    const submitButton = getByText('Giriş Bağlantısı Gönder');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Rate limit exceeded')).toBeTruthy();
    });
  });

  it('should handle Google OAuth', async () => {
    mockAuthService.signInWithGoogle.mockResolvedValueOnce({
      success: true,
      error: null,
    });

    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const googleButton = getByText('Google ile Giriş Yap');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
    });
  });

  it('should toggle help section', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const helpButton = getByText('Nasıl Çalışır?');
    fireEvent.press(helpButton);

    expect(getByText('Yardımı Gizle')).toBeTruthy();

    fireEvent.press(getByText('Yardımı Gizle'));
    expect(getByText('Nasıl Çalışır?')).toBeTruthy();
  });
});
```

### Authentication E2E Testing

```typescript
// e2e/auth.e2e.ts
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete magic link authentication flow', async () => {
    // 1. Should show login screen for unauthenticated user
    await expect(element(by.id('login-screen'))).toBeVisible();

    // 2. Enter email address
    await element(by.id('email-input')).typeText('test@example.com');

    // 3. Tap magic link button
    await element(by.id('magic-link-button')).tap();

    // 4. Should show success message
    await expect(element(by.text('Giriş bağlantısı email adresinize gönderildi!'))).toBeVisible();

    // 5. Simulate magic link callback (in test environment)
    await device.openURL({
      url: 'yeser://auth/callback?access_token=test_token&refresh_token=test_refresh&type=signup',
    });

    // 6. Should navigate to authenticated area
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should handle invalid email validation', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();

    // Enter invalid email
    await element(by.id('email-input')).typeText('invalid-email');
    await element(by.id('magic-link-button')).tap();

    // Should show validation error
    await expect(element(by.text('Geçerli bir email adresi girin'))).toBeVisible();
  });

  it('should handle empty email validation', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();

    // Tap button without entering email
    await element(by.id('magic-link-button')).tap();

    // Should show validation error
    await expect(element(by.text('Lütfen email adresinizi girin'))).toBeVisible();
  });

  it('should show and hide help section', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();

    // Tap help button
    await element(by.text('Nasıl Çalışır?')).tap();

    // Should show help text
    await expect(element(by.text(/Email adresinizi girin ve size özel/))).toBeVisible();
    await expect(element(by.text('Yardımı Gizle'))).toBeVisible();

    // Hide help
    await element(by.text('Yardımı Gizle')).tap();
    await expect(element(by.text('Nasıl Çalışır?'))).toBeVisible();
  });
});
```

## 📊 TanStack Query Testing Patterns

### Query Hook Testing

```typescript
// __tests__/hooks/useUserProfile.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getProfile } from '@/api/profileApi';

// Mock the API
jest.mock('@/api/profileApi');
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch user profile successfully', async () => {
    const mockProfile = {
      id: '123',
      username: 'testuser',
      onboarded: true,
      dailyGratitudeGoal: 3,
    };

    mockGetProfile.mockResolvedValueOnce(mockProfile);

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.error).toBeNull();
  });

  it('should handle profile fetch error', async () => {
    const errorMessage = 'Failed to fetch profile';
    mockGetProfile.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error?.message).toBe(errorMessage);
  });
});
```

### Mutation Hook Testing

```typescript
// __tests__/hooks/useGratitudeMutations.test.ts
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGratitudeMutations } from '@/hooks/useGratitudeMutations';
import { addStatement } from '@/api/gratitudeApi';

jest.mock('@/api/gratitudeApi');
const mockAddStatement = addStatement as jest.MockedFunction<typeof addStatement>;

describe('useGratitudeMutations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    jest.clearAllMocks();
  });

  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should add statement with optimistic update', async () => {
    const entryDate = '2024-01-15';
    const statement = 'I am grateful for testing';
    const mockEntry = {
      id: '123',
      entryDate,
      statements: [statement],
      userId: 'user123',
    };

    mockAddStatement.mockResolvedValueOnce(mockEntry);

    const { result } = renderHook(() => useGratitudeMutations(entryDate), {
      wrapper: createWrapper,
    });

    await act(async () => {
      result.current.addStatement({ entryDate, statement });
    });

    expect(result.current.isAddingStatement).toBe(true);

    await waitFor(() => {
      expect(result.current.isAddingStatement).toBe(false);
    });

    expect(mockAddStatement).toHaveBeenCalledWith(entryDate, statement);
  });

  it('should handle mutation error with rollback', async () => {
    const entryDate = '2024-01-15';
    const statement = 'Test statement';
    const errorMessage = 'Network error';

    mockAddStatement.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useGratitudeMutations(entryDate), {
      wrapper: createWrapper,
    });

    await act(async () => {
      result.current.addStatement({ entryDate, statement });
    });

    await waitFor(() => {
      expect(result.current.isAddingStatement).toBe(false);
    });

    // Verify error handling
    expect(mockAddStatement).toHaveBeenCalledWith(entryDate, statement);
  });
});
```

## 🧩 Component Testing

### Testing TanStack Query-Powered Components

```typescript
// __tests__/components/UserProfileCard.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfileCard } from '@/components/features/UserProfileCard';
import { useUserProfile } from '@/hooks/useUserProfile';

// Mock the hook
jest.mock('@/hooks/useUserProfile');
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('UserProfileCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading state', () => {
    mockUseUserProfile.mockReturnValue({
      profile: null,
      isLoading: true,
      error: null,
      updateProfile: jest.fn(),
      isUpdatingProfile: false,
    });

    render(<UserProfileCard />, { wrapper: createTestWrapper() });

    expect(screen.getByText('Loading profile...')).toBeTruthy();
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should display profile data', async () => {
    const mockProfile = {
      id: '123',
      username: 'testuser',
      fullName: 'Test User',
      dailyGratitudeGoal: 3,
      reminderEnabled: true,
      reminderTime: '20:00:00',
    };

    mockUseUserProfile.mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      updateProfile: jest.fn(),
      isUpdatingProfile: false,
    });

    render(<UserProfileCard showEditButton={true} />, { wrapper: createTestWrapper() });

    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getByText('3 statements')).toBeTruthy();
    expect(screen.getByText('Enabled (20:00:00)')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('should display error state', () => {
    mockUseUserProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: new Error('Failed to load profile'),
      updateProfile: jest.fn(),
      isUpdatingProfile: false,
    });

    render(<UserProfileCard />, { wrapper: createTestWrapper() });

    expect(screen.getByText('Failed to load profile')).toBeTruthy();
  });
});
```

### Testing Form Components

```typescript
// __tests__/components/GratitudeStatementForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GratitudeStatementForm } from '@/components/features/GratitudeStatementForm';
import { useGratitudeMutations } from '@/hooks/useGratitudeMutations';

jest.mock('@/hooks/useGratitudeMutations');
const mockUseGratitudeMutations = useGratitudeMutations as jest.MockedFunction<typeof useGratitudeMutations>;

describe('GratitudeStatementForm', () => {
  const mockAddStatement = jest.fn();

  beforeEach(() => {
    mockUseGratitudeMutations.mockReturnValue({
      addStatement: mockAddStatement,
      isAddingStatement: false,
      editStatement: jest.fn(),
      deleteStatement: jest.fn(),
    });
  });

  it('should submit valid statement', async () => {
    const onSubmitSuccess = jest.fn();
    const entryDate = '2024-01-15';

    render(
      <GratitudeStatementForm
        entryDate={entryDate}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    const input = screen.getByTestId('statement-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.changeText(input, 'I am grateful for this test');
    fireEvent.press(submitButton);

    expect(mockAddStatement).toHaveBeenCalledWith(
      { entryDate, statement: 'I am grateful for this test' },
      expect.any(Object)
    );
  });

  it('should show validation error for empty statement', async () => {
    render(<GratitudeStatementForm entryDate="2024-01-15" />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeTruthy();
      expect(screen.getByText('Please enter a gratitude statement')).toBeTruthy();
    });
  });

  it('should disable form during submission', () => {
    mockUseGratitudeMutations.mockReturnValue({
      addStatement: mockAddStatement,
      isAddingStatement: true,
      editStatement: jest.fn(),
      deleteStatement: jest.fn(),
    });

    render(<GratitudeStatementForm entryDate="2024-01-15" />);

    expect(screen.getByTestId('submit-button')).toBeDisabled();
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });
});
```

## 🔌 API Layer Testing

### Mocking Supabase

```typescript
// __tests__/api/gratitudeApi.test.ts
import { getGratitudeDailyEntries, addStatement } from '@/api/gratitudeApi';
import { supabase } from '@/utils/supabaseClient';

// Mock Supabase client
jest.mock('@/utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    rpc: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('gratitudeApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });
  });

  describe('getGratitudeDailyEntries', () => {
    it('should fetch entries successfully', async () => {
      const mockEntries = [
        {
          id: '1',
          user_id: 'user123',
          entry_date: '2024-01-15',
          statements: ['Statement 1', 'Statement 2'],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockEntries, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await getGratitudeDailyEntries();

      expect(result).toHaveLength(1);
      expect(result[0].statements).toEqual(['Statement 1', 'Statement 2']);
      expect(mockSupabase.from).toHaveBeenCalledWith('gratitude_entries');
    });

    it('should handle fetch error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(getGratitudeDailyEntries()).rejects.toThrow(
        'Failed to fetch entries: Database error'
      );
    });
  });

  describe('addStatement', () => {
    it('should add statement via RPC', async () => {
      const mockResult = [
        {
          id: '123',
          user_id: 'user123',
          entry_date: '2024-01-15',
          statements: ['New statement'],
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockResult, error: null });

      const result = await addStatement('2024-01-15', 'New statement');

      expect(result.statements).toContain('New statement');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_gratitude_statement', {
        p_user_id: 'user123',
        p_entry_date: '2024-01-15',
        p_statement: 'New statement',
      });
    });
  });
});
```

## 🎯 Integration Testing

### Hook + Component Integration

```typescript
// __tests__/integration/gratitudeFlow.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DailyEntryScreen } from '@/screens/DailyEntryScreen';
import * as gratitudeApi from '@/api/gratitudeApi';

jest.mock('@/api/gratitudeApi');
const mockGratitudeApi = gratitudeApi as jest.Mocked<typeof gratitudeApi>;

describe('Gratitude Flow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should complete full gratitude entry flow', async () => {
    // Mock initial empty state
    mockGratitudeApi.getGratitudeDailyEntryByDate.mockResolvedValue(null);

    // Mock successful statement addition
    const mockEntry = {
      id: '123',
      userId: 'user123',
      entryDate: '2024-01-15',
      statements: ['I am grateful for testing'],
    };
    mockGratitudeApi.addStatement.mockResolvedValue(mockEntry);

    renderWithProviders(<DailyEntryScreen />);

    // Verify initial state
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });

    // Add a gratitude statement
    const input = screen.getByTestId('statement-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.changeText(input, 'I am grateful for testing');
    fireEvent.press(submitButton);

    // Verify optimistic update
    expect(screen.getByText('Adding your gratitude statement...')).toBeTruthy();

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText('Adding your gratitude statement...')).toBeNull();
    });

    // Verify API call
    expect(mockGratitudeApi.addStatement).toHaveBeenCalledWith(
      expect.any(String),
      'I am grateful for testing'
    );
  });
});
```

## 🚀 E2E Testing with Detox

### Detox Configuration

```javascript
// detox.config.js
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/yeser.app',
      build:
        'xcodebuild -workspace ios/yeser.xcworkspace -scheme yeser -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

### E2E Test Examples

```typescript
// e2e/gratitudeFlow.e2e.ts
import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Gratitude Entry Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete onboarding and add gratitude entry', async () => {
    // Wait for app to load
    await waitFor(element(by.id('welcome-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Complete onboarding
    await element(by.id('start-onboarding-button')).tap();
    await element(by.id('next-button')).tap();
    await element(by.id('finish-onboarding-button')).tap();

    // Navigate to daily entry
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(3000);

    await element(by.id('daily-entry-tab')).tap();

    // Add gratitude statement
    await element(by.id('statement-input')).typeText('I am grateful for end-to-end testing');
    await element(by.id('submit-button')).tap();

    // Verify success
    await waitFor(element(by.text('I am grateful for end-to-end testing')))
      .toBeVisible()
      .withTimeout(3000);

    // Verify streak update
    await element(by.id('home-tab')).tap();
    await detoxExpect(element(by.id('current-streak'))).toHaveText('1');
  });

  it('should display throwback modal', async () => {
    // Assuming user has entries
    await element(by.id('throwback-button')).tap();

    await waitFor(element(by.id('throwback-modal')))
      .toBeVisible()
      .withTimeout(3000);

    await detoxExpect(element(by.text('Memory Lane'))).toBeVisible();

    // Close modal
    await element(by.id('close-throwback-modal')).tap();

    await waitFor(element(by.id('throwback-modal')))
      .not.toBeVisible()
      .withTimeout(1000);
  });
});
```

## 📈 Performance Testing

### Measuring Component Render Time

```typescript
// __tests__/performance/componentPerformance.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { performance } from 'perf_hooks';
import { GratitudeStatementsList } from '@/components/features/GratitudeStatementsList';

describe('Component Performance', () => {
  it('should render large lists efficiently', async () => {
    const largeStatementList = Array.from({ length: 100 }, (_, i) => `Statement ${i + 1}`);

    const mockEntry = {
      id: '123',
      entryDate: '2024-01-15',
      statements: largeStatementList,
    };

    const startTime = performance.now();

    render(<GratitudeStatementsList entry={mockEntry} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100);
  });
});
```

## 🎯 Test Coverage and Quality

### Coverage Requirements

```javascript
// jest.config.js coverage thresholds
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  // Specific thresholds for critical areas
  'src/api/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  'src/hooks/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
}
```

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## 🔧 Testing Best Practices

### Do's and Don'ts

✅ **Do:**

- Test user-facing behavior, not implementation details
- Use proper act() wrapping for async operations
- Mock external dependencies (APIs, device features)
- Test loading, success, and error states
- Use accessible selectors (testID, role, label)
- Test optimistic updates and rollbacks

❌ **Don't:**

- Test internal component state directly
- Mock components you want to test
- Write tests that duplicate component logic
- Test third-party library internals
- Ignore accessibility in tests

### Test Organization

```
__tests__/
├── components/          # Component unit tests
├── hooks/              # Hook unit tests
├── api/                # API layer tests
├── integration/        # Feature integration tests
├── e2e/               # End-to-end tests
├── performance/       # Performance tests
└── utils/             # Test utilities and helpers
```

---

This testing guide provides comprehensive patterns for testing the modern TanStack Query + React Native architecture, ensuring robust quality assurance for the Yeser gratitude app.
