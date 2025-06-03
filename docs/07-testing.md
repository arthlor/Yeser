# Testing Guide

This document provides comprehensive testing strategies, tools, and best practices for the Yeser gratitude app to ensure quality, reliability, and maintainability.

## 🧪 Testing Strategy Overview

Our testing approach follows the **Testing Pyramid** principle with multiple layers of testing to ensure comprehensive coverage:

```
                    ▲
                   / \
                  /   \
                 /  E2E \
                /  Tests \
               /---------\
              /           \
             / Integration \
            /    Tests     \
           /_______________\
          /                 \
         /    Unit Tests     \
        /___________________\
```

### Testing Principles

1. **Test Pyramid**: More unit tests, fewer integration tests, minimal E2E tests
2. **Fast Feedback**: Quick test execution for rapid development cycles
3. **Reliable Tests**: Consistent, deterministic test results
4. **Maintainable**: Easy to update tests when requirements change
5. **Comprehensive Coverage**: Test critical paths and edge cases

## 🏗️ Testing Stack

### Core Testing Tools

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Jest** | Test runner and assertion library | `jest.config.cjs` |
| **React Native Testing Library** | Component testing utilities | Built-in |
| **Detox** | End-to-end testing framework | `.detoxrc.js` |
| **MSW** | API mocking for tests | Manual setup |
| **Flipper** | Debug and testing utilities | Development only |

### Test Configuration

#### Jest Configuration

```javascript
// jest.config.cjs
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './jest-setup.ts'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|expo-|@expo|@unimodules/|native-base|react-clone-referenced-element)'
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/types/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

#### Jest Setup File

```typescript
// jest-setup.ts
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

// Global test utilities
global.__DEV__ = true;

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});
```

## 🔬 Unit Testing

### Component Testing

#### Basic Component Tests

```typescript
// __tests__/components/ThemedButton.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Test wrapper with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('ThemedButton', () => {
  it('renders with correct text', () => {
    const { getByText } = renderWithProviders(
      <ThemedButton title="Test Button" onPress={() => {}} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = renderWithProviders(
      <ThemedButton title="Test Button" onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state correctly', () => {
    const { getByTestId } = renderWithProviders(
      <ThemedButton title="Test Button" onPress={() => {}} loading />
    );
    
    expect(getByTestId('button-loading-indicator')).toBeTruthy();
  });

  it('is disabled when disabled prop is true', () => {
    const mockOnPress = jest.fn();
    const { getByText } = renderWithProviders(
      <ThemedButton title="Test Button" onPress={mockOnPress} disabled />
    );
    
    const button = getByText('Test Button');
    fireEvent.press(button);
    expect(mockOnPress).not.toHaveBeenCalled();
  });
});
```

#### Advanced Component Testing

```typescript
// __tests__/components/GratitudeEntryCard.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GratitudeEntryCard } from '@/components/GratitudeEntryCard';
import { createMockGratitudeEntry } from '../utils/mockData';

describe('GratitudeEntryCard', () => {
  const mockEntry = createMockGratitudeEntry({
    entry_date: '2024-01-15',
    statements: ['Grateful for sunny weather', 'Thankful for good health']
  });

  it('displays all gratitude statements', () => {
    const { getByText } = render(
      <GratitudeEntryCard entry={mockEntry} />
    );
    
    expect(getByText('Grateful for sunny weather')).toBeTruthy();
    expect(getByText('Thankful for good health')).toBeTruthy();
  });

  it('calls onEdit when edit button is pressed', async () => {
    const mockOnEdit = jest.fn();
    const { getByTestId } = render(
      <GratitudeEntryCard 
        entry={mockEntry} 
        onEdit={mockOnEdit}
        editable 
      />
    );
    
    fireEvent.press(getByTestId('edit-entry-button'));
    await waitFor(() => {
      expect(mockOnEdit).toHaveBeenCalledWith(mockEntry);
    });
  });

  it('shows confirmation dialog before deletion', async () => {
    const mockOnDelete = jest.fn();
    const { getByTestId, getByText } = render(
      <GratitudeEntryCard 
        entry={mockEntry} 
        onDelete={mockOnDelete}
        editable 
      />
    );
    
    fireEvent.press(getByTestId('delete-entry-button'));
    
    // Should show confirmation dialog
    await waitFor(() => {
      expect(getByText('Delete Entry')).toBeTruthy();
    });
    
    // Confirm deletion
    fireEvent.press(getByText('Delete'));
    
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(mockEntry.id);
    });
  });
});
```

### Hook Testing

```typescript
// __tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

// Mock the auth store
jest.mock('@/store/authStore');
const mockAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user when authenticated', () => {
    mockAuthStore.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
      loginWithEmail: jest.fn(),
      logout: jest.fn(),
    });

    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toEqual({
      id: '123',
      email: 'test@example.com'
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login correctly', async () => {
    const mockLogin = jest.fn().mockResolvedValue({ success: true });
    mockAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      loginWithEmail: mockLogin,
      logout: jest.fn(),
    });

    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.loginWithEmail('test@example.com', 'password');
    });
    
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
  });
});
```

### Store Testing

```typescript
// __tests__/store/gratitudeStore.test.ts
import { useGratitudeStore } from '@/store/gratitudeStore';
import { createMockGratitudeEntry } from '../utils/mockData';
import * as gratitudeApi from '@/api/gratitudeApi';

// Mock the API
jest.mock('@/api/gratitudeApi');
const mockGratitudeApi = gratitudeApi as jest.Mocked<typeof gratitudeApi>;

describe('GratitudeStore', () => {
  beforeEach(() => {
    // Reset store state
    useGratitudeStore.getState().reset();
    jest.clearAllMocks();
  });

  it('adds statement optimistically and syncs with backend', async () => {
    const mockEntry = createMockGratitudeEntry();
    mockGratitudeApi.addStatement.mockResolvedValue(mockEntry);

    const { addStatement, entries } = useGratitudeStore.getState();
    
    // Should immediately update optimistically
    const promise = addStatement('2024-01-15', 'Test statement');
    
    // Check optimistic update
    expect(entries['2024-01-15']?.statements).toContain('Test statement');
    
    // Wait for backend sync
    await promise;
    
    expect(mockGratitudeApi.addStatement).toHaveBeenCalledWith(
      '2024-01-15', 
      'Test statement'
    );
  });

  it('rolls back optimistic update on API error', async () => {
    mockGratitudeApi.addStatement.mockRejectedValue(new Error('API Error'));

    const { addStatement, entries } = useGratitudeStore.getState();
    
    try {
      await addStatement('2024-01-15', 'Test statement');
    } catch (error) {
      // Should rollback optimistic update
      expect(entries['2024-01-15']).toBeNull();
    }
  });

  it('handles concurrent operations correctly', async () => {
    const mockEntry1 = createMockGratitudeEntry({ statements: ['Statement 1'] });
    const mockEntry2 = createMockGratitudeEntry({ statements: ['Statement 1', 'Statement 2'] });
    
    mockGratitudeApi.addStatement
      .mockResolvedValueOnce(mockEntry1)
      .mockResolvedValueOnce(mockEntry2);

    const { addStatement } = useGratitudeStore.getState();
    
    // Start concurrent operations
    const promise1 = addStatement('2024-01-15', 'Statement 1');
    const promise2 = addStatement('2024-01-15', 'Statement 2');
    
    await Promise.all([promise1, promise2]);
    
    // Both statements should be present
    const finalEntry = useGratitudeStore.getState().entries['2024-01-15'];
    expect(finalEntry?.statements).toHaveLength(2);
  });
});
```

### Utility Function Testing

```typescript
// __tests__/utils/dateUtils.test.ts
import { 
  formatDate, 
  getCurrentFormattedDate, 
  parseTimeStringToValidDate 
} from '@/utils/dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
    });

    it('handles invalid dates', () => {
      const invalidDate = new Date('invalid');
      expect(formatDate(invalidDate, 'YYYY-MM-DD')).toBe('Invalid Date');
    });
  });

  describe('getCurrentFormattedDate', () => {
    it('returns current date in YYYY-MM-DD format', () => {
      const today = getCurrentFormattedDate();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('parseTimeStringToValidDate', () => {
    it('parses time string correctly', () => {
      const date = parseTimeStringToValidDate('14:30:00');
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(0);
    });

    it('handles invalid time strings', () => {
      expect(() => parseTimeStringToValidDate('invalid')).toThrow();
    });
  });
});
```

## 🔗 Integration Testing

### API Integration Tests

```typescript
// __tests__/integration/gratitudeApi.integration.test.ts
import { supabase } from '@/utils/supabaseClient';
import { addStatement, getGratitudeDailyEntryByDate } from '@/api/gratitudeApi';

describe('Gratitude API Integration', () => {
  let testUserId: string;
  
  beforeAll(async () => {
    // Create test user
    const { data: user } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    testUserId = user.user!.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.auth.signOut();
  });

  it('creates and retrieves gratitude entry', async () => {
    const testDate = '2024-01-15';
    const testStatement = 'Integration test statement';
    
    // Add statement
    const createdEntry = await addStatement(testDate, testStatement);
    expect(createdEntry).toBeTruthy();
    expect(createdEntry?.statements).toContain(testStatement);
    
    // Retrieve entry
    const retrievedEntry = await getGratitudeDailyEntryByDate(testDate);
    expect(retrievedEntry?.id).toBe(createdEntry?.id);
    expect(retrievedEntry?.statements).toContain(testStatement);
  });

  it('handles concurrent additions correctly', async () => {
    const testDate = '2024-01-16';
    
    // Add multiple statements concurrently
    const promises = [
      addStatement(testDate, 'Statement 1'),
      addStatement(testDate, 'Statement 2'),
      addStatement(testDate, 'Statement 3')
    ];
    
    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(result => {
      expect(result).toBeTruthy();
    });
    
    // Final entry should contain all statements
    const finalEntry = await getGratitudeDailyEntryByDate(testDate);
    expect(finalEntry?.statements).toHaveLength(3);
  });
});
```

### Store Integration Tests

```typescript
// __tests__/integration/authFlow.integration.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';

describe('Authentication Flow Integration', () => {
  it('completes full authentication flow', async () => {
    const authStore = renderHook(() => useAuthStore());
    const profileStore = renderHook(() => useProfileStore());
    
    // Initial state
    expect(authStore.result.current.isAuthenticated).toBe(false);
    expect(profileStore.result.current.profile).toBeNull();
    
    // Login
    await act(async () => {
      await authStore.result.current.loginWithEmail({
        email: 'test@example.com',
        password: 'password123'
      });
    });
    
    // Check authentication
    expect(authStore.result.current.isAuthenticated).toBe(true);
    expect(authStore.result.current.user).toBeTruthy();
    
    // Profile should be fetched automatically
    await act(async () => {
      // Wait for profile fetch
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(profileStore.result.current.profile).toBeTruthy();
    
    // Logout
    await act(async () => {
      await authStore.result.current.logout();
    });
    
    // Check cleanup
    expect(authStore.result.current.isAuthenticated).toBe(false);
    expect(profileStore.result.current.profile).toBeNull();
  });
});
```

## 🎭 End-to-End Testing

### Detox Configuration

```javascript
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupFilesAfterEnv: ['./e2e/init.js']
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Yeser.app',
      build: 'xcodebuild -workspace ios/Yeser.xcworkspace -scheme Yeser -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081]
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

### E2E Test Examples

```typescript
// e2e/auth.e2e.ts
import { device, element, by, expect } from 'detox';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete Google OAuth login', async () => {
    // Navigate to login screen
    await element(by.id('google-login-button')).tap();
    
    // Wait for OAuth flow (mocked in test environment)
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Verify user is logged in
    await expect(element(by.id('user-profile-button'))).toBeVisible();
  });

  it('should handle login error gracefully', async () => {
    // Trigger login error
    await element(by.id('trigger-login-error')).tap();
    
    // Should show error message
    await expect(element(by.text('Login failed'))).toBeVisible();
    
    // Should remain on login screen
    await expect(element(by.id('login-screen'))).toBeVisible();
  });
});
```

```typescript
// e2e/gratitude.e2e.ts
import { device, element, by, expect } from 'detox';

describe('Gratitude Entry Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Login first
    await element(by.id('google-login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible();
  });

  it('should add gratitude statement', async () => {
    // Navigate to daily entry
    await element(by.id('daily-entry-tab')).tap();
    
    // Add statement
    await element(by.id('gratitude-input')).typeText('E2E test gratitude statement');
    await element(by.id('add-statement-button')).tap();
    
    // Verify statement appears
    await expect(element(by.text('E2E test gratitude statement'))).toBeVisible();
    
    // Verify streak counter updates
    await expect(element(by.id('streak-counter'))).toBeVisible();
  });

  it('should edit existing statement', async () => {
    // Long press on existing statement
    await element(by.text('E2E test gratitude statement')).longPress();
    
    // Select edit option
    await element(by.text('Edit')).tap();
    
    // Modify text
    await element(by.id('edit-statement-input')).clearText();
    await element(by.id('edit-statement-input')).typeText('Edited E2E statement');
    
    // Save changes
    await element(by.id('save-edit-button')).tap();
    
    // Verify updated text
    await expect(element(by.text('Edited E2E statement'))).toBeVisible();
  });

  it('should navigate between months in calendar', async () => {
    // Navigate to past entries
    await element(by.id('past-entries-tab')).tap();
    
    // Swipe to previous month
    await element(by.id('calendar-view')).swipe('right');
    
    // Verify month changed
    await expect(element(by.id('calendar-month-header'))).toBeVisible();
    
    // Tap on a date with entry
    await element(by.id('calendar-date-with-entry')).tap();
    
    // Verify entry details shown
    await expect(element(by.id('entry-details-modal'))).toBeVisible();
  });
});
```

## 🎯 Test Data Management

### Mock Data Utilities

```typescript
// __tests__/utils/mockData.ts
import { GratitudeEntry, Profile, Streak } from '@/types/api.types';

export const createMockGratitudeEntry = (overrides?: Partial<GratitudeEntry>): GratitudeEntry => ({
  id: 'mock-entry-id',
  user_id: 'mock-user-id',
  entry_date: '2024-01-15',
  statements: ['Mock gratitude statement'],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

export const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'mock-user-id',
  username: 'testuser',
  onboarded: true,
  reminder_enabled: true,
  reminder_time: '20:00:00',
  throwback_reminder_enabled: true,
  throwback_reminder_frequency: 'weekly',
  daily_gratitude_goal: 3,
  use_varied_prompts: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockStreak = (overrides?: Partial<Streak>): Streak => ({
  id: 'mock-streak-id',
  user_id: 'mock-user-id',
  current_streak: 5,
  longest_streak: 15,
  last_entry_date: new Date('2024-01-15'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-15'),
  ...overrides,
});

// Test data generators
export const generateMockEntries = (count: number): GratitudeEntry[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockGratitudeEntry({
      entry_date: `2024-01-${String(index + 1).padStart(2, '0')}`,
      statements: [`Gratitude statement ${index + 1}`],
    })
  );
};
```

### Test Helpers

```typescript
// __tests__/utils/testHelpers.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Custom render function with providers
interface CustomRenderOptions extends RenderOptions {
  queryClient?: QueryClient;
}

const AllTheProviders: React.FC<{ 
  children: React.ReactNode;
  queryClient?: QueryClient;
}> = ({ children, queryClient }) => {
  const defaultQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient || defaultQueryClient}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
) => {
  const { queryClient, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Wait utilities
export const waitForNextTick = () => new Promise(resolve => setImmediate(resolve));

export const waitForTime = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock implementations
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
});

export const createMockRoute = (params = {}) => ({
  key: 'mock-route-key',
  name: 'MockScreen',
  params,
});
```

## 📊 Coverage and Quality Metrics

### Coverage Configuration

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --ci --watchAll=false",
    "test:update-snapshots": "jest --updateSnapshot"
  }
}
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html

# Coverage thresholds in jest.config.cjs
coverageThreshold: {
  global: {
    branches: 70,    // 70% branch coverage
    functions: 80,   // 80% function coverage
    lines: 80,       // 80% line coverage
    statements: 80   // 80% statement coverage
  },
  // Per-file thresholds
  './src/api/**/*.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

### Quality Gates

```typescript
// scripts/quality-gate.js
const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');
const REQUIRED_COVERAGE = {
  branches: 70,
  functions: 80,
  lines: 80,
  statements: 80
};

function checkCoverage() {
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage file not found. Run tests first.');
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const { total } = coverage;

  let failed = false;

  Object.entries(REQUIRED_COVERAGE).forEach(([metric, threshold]) => {
    const actual = total[metric].pct;
    if (actual < threshold) {
      console.error(`❌ ${metric} coverage ${actual}% is below threshold ${threshold}%`);
      failed = true;
    } else {
      console.log(`✅ ${metric} coverage ${actual}% meets threshold ${threshold}%`);
    }
  });

  if (failed) {
    process.exit(1);
  } else {
    console.log('🎉 All coverage thresholds met!');
  }
}

checkCoverage();
```

## 🚀 Continuous Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:ci
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true

  e2e-tests:
    runs-on: macos-latest
    needs: unit-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup iOS Simulator
        run: |
          xcrun simctl boot "iPhone 14" || true
          xcrun simctl list devices
      
      - name: Build iOS app for testing
        run: npx detox build --configuration ios.sim.debug
      
      - name: Run E2E tests
        run: npx detox test --configuration ios.sim.debug
      
      - name: Upload E2E artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-artifacts
          path: artifacts/
```

## 🔧 Test Development Tools

### Test Scripts

```json
{
  "scripts": {
    "test:debug": "jest --runInBand --no-cache",
    "test:specific": "jest --testNamePattern=",
    "test:file": "jest --testPathPattern=",
    "test:changed": "jest --onlyChanged",
    "test:related": "jest --findRelatedTests",
    "test:clear-cache": "jest --clearCache"
  }
}
```

### VS Code Test Configuration

```json
{
  "jest.jestCommandLine": "npm test --",
  "jest.autoRun": "off",
  "jest.showCoverageOnLoad": true,
  "jest.coverageFormatter": "DefaultFormatter"
}
```

## 🐛 Common Testing Patterns

### Async Testing

```typescript
// Testing async operations
it('handles async operations correctly', async () => {
  const promise = asyncOperation();
  
  // Test loading state
  expect(getLoadingIndicator()).toBeVisible();
  
  // Wait for completion
  await promise;
  
  // Test final state
  expect(getSuccessMessage()).toBeVisible();
});

// Testing with fake timers
it('handles timeouts correctly', () => {
  jest.useFakeTimers();
  
  const callback = jest.fn();
  setTimeout(callback, 1000);
  
  // Fast-forward time
  jest.advanceTimersByTime(1000);
  
  expect(callback).toHaveBeenCalled();
  
  jest.useRealTimers();
});
```

### Error Testing

```typescript
// Testing error states
it('handles API errors gracefully', async () => {
  mockApiCall.mockRejectedValue(new Error('API Error'));
  
  const { getByText } = render(<ComponentUnderTest />);
  
  // Trigger error
  fireEvent.press(getByText('Submit'));
  
  // Wait for error state
  await waitFor(() => {
    expect(getByText('Error occurred')).toBeVisible();
  });
});
```

### Snapshot Testing

```typescript
// Component snapshot testing
it('matches snapshot', () => {
  const tree = render(<Component prop="value" />).toJSON();
  expect(tree).toMatchSnapshot();
});

// State snapshot testing
it('store state matches snapshot', () => {
  const state = useGratitudeStore.getState();
  expect(state).toMatchSnapshot({
    // Ignore dynamic fields
    lastUpdated: expect.any(Number),
  });
});
```

---

This comprehensive testing guide provides all the tools and practices needed to maintain high-quality, reliable code in the Yeser gratitude app through effective testing strategies. 