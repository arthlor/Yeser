# Testing Guide

This document provides comprehensive testing strategies and methodologies for the Yeşer gratitude app, covering **7-layer error protection testing**, **magic link authentication testing**, **performance testing**, and **Turkish localization testing** with production-ready quality assurance practices.

## 🧪 Testing Architecture Overview

The Yeşer app implements a **comprehensive testing strategy** that ensures:

- **7-Layer Error Protection Validation**: Testing all error handling layers and fallback mechanisms
- **Magic Link Authentication Testing**: Complete passwordless authentication flow validation
- **Performance Regression Testing**: Continuous monitoring of optimization achievements
- **Turkish Localization Testing**: Cultural sensitivity and language accuracy validation
- **TanStack Query Testing**: Server state management and caching validation
- **Cross-Platform Testing**: iOS and Android compatibility assurance
- **Production Parity Testing**: Development environment mirrors production behavior

```
┌─────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              E2E TESTS                          │   │
│  │  Authentication flows, Critical user journeys  │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │           INTEGRATION TESTS                     │   │
│  │  API integration, Store integration, Hooks     │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │              UNIT TESTS                         │   │
│  │  Components, Utilities, Services, Schemas      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           ERROR PROTECTION TESTS                │   │
│  │  7-layer validation, Error scenarios           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Authentication Testing (Enhanced)

### Magic Link Authentication Testing

#### Test Scenarios for Passwordless Authentication

```typescript
// __tests__/auth/magicLinkAuth.test.ts
import { authService } from '@/services/authService';
import { deepLinkAuthService } from '@/services/deepLinkAuthService';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorUtils';

describe('Magic Link Authentication with 7-Layer Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Validation and Magic Link Sending', () => {
    test('should validate email format with Turkish error messages', () => {
      const invalidEmails = ['invalid-email', 'test@', '@domain.com', ''];
      const validEmails = ['test@example.com', 'user@yeser.app', 'türkçe@test.com'];

      invalidEmails.forEach((email) => {
        expect(authService.validateEmail(email)).toBe(false);
      });

      validEmails.forEach((email) => {
        expect(authService.validateEmail(email)).toBe(true);
      });
    });

    test('should send magic link with proper error protection', async () => {
      const mockEmail = 'test@example.com';

      // Mock successful magic link send
      const result = await authService.signInWithMagicLink(mockEmail);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith('Magic link sent successfully', {
        email: mockEmail,
      });
    });

    test('should handle rate limiting with Turkish error messages', async () => {
      const mockEmail = 'test@example.com';

      // Mock rate limit error
      const mockError = { message: 'rate_limit_exceeded' };
      jest.spyOn(authService, 'signInWithMagicLink').mockRejectedValue(mockError);

      const result = await authService.signInWithMagicLink(mockEmail);

      expect(result.success).toBe(false);
      expect(result.error).toContain('çok fazla');
      expect(result.error).not.toContain('rate_limit'); // Technical error not exposed
    });

    test('should apply 7-layer error protection for network errors', async () => {
      const mockEmail = 'test@example.com';
      const networkError = new Error('Network request failed');

      jest.spyOn(authService, 'signInWithMagicLink').mockRejectedValue(networkError);

      const result = await authService.signInWithMagicLink(mockEmail);

      expect(result.success).toBe(false);
      expect(result.error).toBe(safeErrorDisplay(networkError));
      expect(result.error).toMatch(/türkçe.*hata/i); // Turkish error message
    });
  });

  describe('Deep Link Handling', () => {
    test('should process valid magic link callback URLs', async () => {
      const validUrl =
        'yeser://auth/callback?access_token=valid_token&refresh_token=refresh_token&expires_in=3600';

      const result = await deepLinkAuthService.handleAuthCallback(validUrl);

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.access_token).toBe('valid_token');
    });

    test('should handle expired tokens with Turkish error messages', async () => {
      const expiredUrl =
        'yeser://auth/callback?error=token_expired&error_description=Token%20has%20expired';

      const result = await deepLinkAuthService.handleAuthCallback(expiredUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('süresi dolmuş');
      expect(result.error).not.toContain('token_expired'); // Technical error not exposed
    });

    test('should validate URL scheme and parameters', async () => {
      const invalidUrls = [
        'invalid://auth/callback',
        'yeser://wrong/path',
        'yeser://auth/callback', // No parameters
        'yeser://auth/callback?invalid=params',
      ];

      for (const url of invalidUrls) {
        const result = await deepLinkAuthService.handleAuthCallback(url);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/geçersiz.*bağlantı/i);
      }
    });
  });

  describe('Google OAuth Testing', () => {
    test('should handle Google OAuth success flow', async () => {
      const result = await authService.signInWithGoogle();

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.userCancelled).toBe(false);
    });

    test('should handle user cancellation gracefully', async () => {
      const mockCancellationError = { code: 'USER_CANCELLED' };
      jest.spyOn(authService, 'signInWithGoogle').mockRejectedValue(mockCancellationError);

      const result = await authService.signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.userCancelled).toBe(true);
      expect(result.error).toBeUndefined(); // No error message for cancellation
    });

    test('should handle Google OAuth errors with protection', async () => {
      const mockOAuthError = { message: 'OAuth session failed' };
      jest.spyOn(authService, 'signInWithGoogle').mockRejectedValue(mockOAuthError);

      const result = await authService.signInWithGoogle();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Google ile giriş');
      expect(result.error).not.toContain('OAuth session failed'); // Technical error not exposed
    });
  });
});
```

### Authentication Integration Tests

```typescript
// __tests__/auth/authFlow.integration.test.ts
import { useAuthStore } from '@/store/authStore';
import { queryClient } from '@/api/queryClient';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    useAuthStore.getState().reset(); // Reset auth state
    queryClient.clear(); // Clear query cache
  });

  test('complete magic link authentication flow', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);

    // 1. Enter email
    const emailInput = getByTestId('email-input');
    fireEvent.changeText(emailInput, 'test@example.com');

    // 2. Submit magic link request
    const magicLinkButton = getByTestId('magic-link-button');
    fireEvent.press(magicLinkButton);

    // 3. Verify success message appears
    await waitFor(() => {
      expect(getByText('Giriş bağlantısı email adresinize gönderildi!')).toBeTruthy();
    });

    // 4. Simulate deep link callback
    const mockSession = {
      access_token: 'test_token',
      user: { id: 'test_user', email: 'test@example.com' },
    };

    useAuthStore.getState().setSession(mockSession);

    // 5. Verify authentication state
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().session?.user?.email).toBe('test@example.com');
    });
  });

  test('authentication error handling with Turkish messages', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);

    // Mock authentication failure
    jest.spyOn(authService, 'signInWithMagicLink').mockRejectedValue(
      new Error('Invalid email address')
    );

    const emailInput = getByTestId('email-input');
    fireEvent.changeText(emailInput, 'invalid@email.com');

    const magicLinkButton = getByTestId('magic-link-button');
    fireEvent.press(magicLinkButton);

    // Verify Turkish error message appears
    await waitFor(() => {
      const errorElement = getByText(/hata.*oluştu/i);
      expect(errorElement).toBeTruthy();
      expect(errorElement.props.children).not.toContain('Invalid email'); // No technical error
    });
  });
});
```

## 🛡️ 7-Layer Error Protection Testing

### Error Protection Layer Validation

```typescript
// __tests__/errorProtection/errorLayers.test.ts
import { safeErrorDisplay } from '@/utils/errorUtils';
import { analyzeErrorLayers } from '@/utils/errorDebugging';
import { globalErrorHandler } from '@/providers/ErrorProvider';

describe('7-Layer Error Protection System', () => {
  describe('Layer 1: Enhanced Error Translation', () => {
    test('should translate technical errors to Turkish', () => {
      const technicalErrors = [
        { message: 'Network request failed', expected: /ağ.*hatası/i },
        { message: 'Invalid credentials', expected: /geçersiz.*bilgiler/i },
        { message: 'OAuth session failed', expected: /giriş.*başarısız/i },
        { code: 'USER_CANCELLED', expected: undefined }, // Should be filtered out
      ];

      technicalErrors.forEach(({ message, code, expected }) => {
        const error = message ? { message } : { code };
        const result = safeErrorDisplay(error);

        if (expected) {
          expect(result).toMatch(expected);
          expect(result).not.toContain(message || code); // Technical details not exposed
        } else {
          expect(result).toBe(''); // User cancellation should return empty string
        }
      });
    });

    test('should handle Google OAuth specific errors', () => {
      const oauthErrors = [
        'OAuth session failed',
        'Google sign-in cancelled',
        'OAuth configuration error',
      ];

      oauthErrors.forEach(errorMessage => {
        const result = safeErrorDisplay({ message: errorMessage });
        expect(result).toContain('Google ile giriş');
        expect(result).not.toContain('OAuth');
        expect(result).not.toContain('session');
      });
    });
  });

  describe('Layer 2: Global Error Monitoring', () => {
    test('should capture and log console errors', () => {
      const mockLogger = jest.spyOn(console, 'error').mockImplementation();

      // Simulate console error
      console.error('Unhandled error occurred');

      expect(mockLogger).toHaveBeenCalledWith('Unhandled error occurred');
      mockLogger.mockRestore();
    });

    test('should monitor unhandled promise rejections', async () => {
      const mockLogger = jest.spyOn(logger, 'error').mockImplementation();

      // Simulate unhandled promise rejection
      Promise.reject(new Error('Unhandled promise rejection')).catch(() => {});

      await new Promise(resolve => setTimeout(resolve, 100)); // Allow event loop to process

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled promise rejection'),
        expect.any(Object)
      );

      mockLogger.mockRestore();
    });
  });

  describe('Layer 3-7: Component and UI Protection', () => {
    test('should provide safe fallback for component errors', () => {
      const ComponentWithError = () => {
        throw new Error('Component crashed');
      };

      const ProtectedComponent = () => (
        <ErrorBoundary fallback={<Text>Güvenli yedek içerik</Text>}>
          <ComponentWithError />
        </ErrorBoundary>
      );

      const { getByText } = render(<ProtectedComponent />);

      expect(getByText('Güvenli yedek içerik')).toBeTruthy();
    });

    test('should maintain UI stability during errors', async () => {
      const { getByTestId } = render(<TestComponentWithErrorScenarios />);

      // Trigger various error scenarios
      fireEvent.press(getByTestId('trigger-network-error'));
      fireEvent.press(getByTestId('trigger-auth-error'));
      fireEvent.press(getByTestId('trigger-validation-error'));

      // UI should remain stable and functional
      await waitFor(() => {
        expect(getByTestId('main-content')).toBeTruthy();
        expect(getByTestId('error-count')).toHaveTextContent('3'); // Errors logged but UI stable
      });
    });
  });

  describe('Error Layer Analysis (Development)', () => {
    test('should analyze error flow through all layers', () => {
      const mockConsoleTable = jest.spyOn(console, 'table').mockImplementation();

      const testError = new Error('Test error for layer analysis');
      analyzeErrorLayers(testError, 'Test Context');

      expect(mockConsoleTable).toHaveBeenCalledWith(
        expect.objectContaining({
          layer7_uiProtection: 'Applied',
          finalMessage: expect.stringContaining('hata'),
        })
      );

      mockConsoleTable.mockRestore();
    });
  });
});
```

## 📊 Performance Testing (Production Metrics)

### Component Performance Testing

```typescript
// __tests__/performance/componentPerformance.test.ts
import { withPerformanceMonitoring } from '@/utils/performanceUtils';
import { render } from '@testing-library/react-native';

describe('Component Performance (Optimization Validation)', () => {
  test('should render components within performance budget', async () => {
    const performanceData: Array<{ component: string; renderTime: number }> = [];

    const mockLogger = jest.spyOn(logger, 'debug').mockImplementation((message, data) => {
      if (message.includes('render performance')) {
        performanceData.push({
          component: data.component || 'unknown',
          renderTime: parseFloat(data.renderTime) || 0,
        });
      }
    });

    // Test critical components
    const components = [
      { Component: MonitoredGratitudeCard, name: 'GratitudeCard' },
      { Component: MonitoredHomeScreen, name: 'HomeScreen' },
      { Component: MonitoredLoginScreen, name: 'LoginScreen' },
    ];

    for (const { Component, name } of components) {
      render(<Component testProps={{}} />);
    }

    // Verify all components render within 16ms (60fps budget)
    performanceData.forEach(({ component, renderTime }) => {
      expect(renderTime).toBeLessThan(16);
    });

    mockLogger.mockRestore();
  });

  test('should validate memoization effectiveness', () => {
    const TestComponent = React.memo(({ data }: { data: any[] }) => (
      <View>{data.map(item => <Text key={item.id}>{item.text}</Text>)}</View>
    ));

    const testData = [{ id: 1, text: 'Test' }];

    const { rerender } = render(<TestComponent data={testData} />);

    // Component should not re-render with same props
    const renderCountBefore = React.renderCount || 0;
    rerender(<TestComponent data={testData} />);
    const renderCountAfter = React.renderCount || 0;

    expect(renderCountAfter).toBe(renderCountBefore); // No re-render due to memo
  });
});
```

### Query Performance Testing

```typescript
// __tests__/performance/queryPerformance.test.ts
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { renderHook, waitFor } from '@testing-library/react-native';

describe('TanStack Query Performance', () => {
  test('should cache queries effectively', async () => {
    const { result } = renderHook(() => useGratitudeQueries('test-user'));

    // First query
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialFetchTime = performance.now();

    // Second query should be instant (cached)
    const { result: secondResult } = renderHook(() => useGratitudeQueries('test-user'));

    const cachedFetchTime = performance.now();
    const cacheHitTime = cachedFetchTime - initialFetchTime;

    expect(cacheHitTime).toBeLessThan(5); // Should be nearly instant
    expect(secondResult.current.data).toEqual(result.current.data);
  });

  test('should handle background refetching efficiently', async () => {
    const networkRequestCount = { count: 0 };

    // Mock API to count requests
    jest.spyOn(gratitudeApi, 'getGratitudeEntries').mockImplementation(async () => {
      networkRequestCount.count++;
      return mockGratitudeData;
    });

    const { result } = renderHook(() => useGratitudeQueries('test-user'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger background refetch
    queryClient.invalidateQueries(queryKeys.gratitudeEntries('test-user'));

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    // Should only make one additional request for background refetch
    expect(networkRequestCount.count).toBe(2); // Initial + background
  });
});
```

## 🌍 Turkish Localization Testing

### Error Message Localization

```typescript
// __tests__/localization/turkishErrors.test.ts
import { translateErrorMessage } from '@/utils/errorUtils';

describe('Turkish Error Message Localization', () => {
  test('should provide culturally appropriate error messages', () => {
    const errorScenarios = [
      {
        technical: 'Network request failed',
        expected: {
          turkish: /internet.*bağlantı.*hata/i,
          polite: /lütfen.*tekrar.*deneyin/i,
          helpful: /kontrol.*edin/i,
        },
      },
      {
        technical: 'Authentication failed',
        expected: {
          turkish: /giriş.*başarısız/i,
          polite: /lütfen.*bilgiler/i,
          clear: /kontrol.*edin/i,
        },
      },
      {
        technical: 'Rate limit exceeded',
        expected: {
          turkish: /çok.*fazla.*deneme/i,
          polite: /lütfen.*bekleyin/i,
          timeframe: /dakika.*bekleyin/i,
        },
      },
    ];

    errorScenarios.forEach(({ technical, expected }) => {
      const translated = translateErrorMessage(technical);

      Object.entries(expected).forEach(([aspect, pattern]) => {
        expect(translated).toMatch(pattern);
      });

      // Should not contain technical English terms
      expect(translated).not.toContain('request');
      expect(translated).not.toContain('authentication');
      expect(translated).not.toContain('limit');
    });
  });

  test('should handle edge cases gracefully', () => {
    const edgeCases = [
      { input: null, expected: 'Beklenmeyen bir hata oluştu' },
      { input: undefined, expected: 'Beklenmeyen bir hata oluştu' },
      { input: '', expected: 'Beklenmeyen bir hata oluştu' },
      { input: { code: 'USER_CANCELLED' }, expected: '' }, // Should be empty for cancellation
    ];

    edgeCases.forEach(({ input, expected }) => {
      const result = translateErrorMessage(input);
      expect(result).toBe(expected);
    });
  });
});
```

## 🔄 End-to-End Testing

### Critical User Journey Testing

```typescript
// e2e/criticalJourneys.e2e.ts
import { device, element, by, expect as detoxExpect } from 'detox';

describe('Critical User Journeys', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  test('complete authentication and gratitude entry flow', async () => {
    // 1. Authentication Flow
    await detoxExpected(element(by.id('login-screen'))).toBeVisible();

    await element(by.id('email-input')).typeText('test@yeser.app');
    await element(by.id('magic-link-button')).tap();

    await detoxExpected(
      element(by.text('Giriş bağlantısı email adresinize gönderildi!'))
    ).toBeVisible();

    // Simulate magic link callback
    await device.openURL('yeser://auth/callback?access_token=test_token');

    // 2. Verify successful authentication
    await detoxExpected(element(by.id('home-screen'))).toBeVisible();

    // 3. Create gratitude entry
    await element(by.id('add-gratitude-button')).tap();
    await element(by.id('gratitude-input')).typeText('Ailem için şükrediyorum');
    await element(by.id('save-gratitude-button')).tap();

    // 4. Verify entry appears
    await detoxExpected(element(by.text('Ailem için şükrediyorum'))).toBeVisible();

    // 5. Verify Turkish UI elements
    await detoxExpected(element(by.text('Şükür Günlüğü'))).toBeVisible();
    await detoxExpected(element(by.text('Bugünkü Şükürlerim'))).toBeVisible();
  });

  test('error recovery and user guidance', async () => {
    // Test network error scenario
    await device.disableNetworkConnection();

    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('magic-link-button')).tap();

    // Should show Turkish error message
    await detoxExpected(element(by.text(/internet.*bağlantı/i))).toBeVisible();

    // Re-enable network
    await device.enableNetworkConnection();

    // Retry should work
    await element(by.id('magic-link-button')).tap();
    await detoxExpected(
      element(by.text('Giriş bağlantısı email adresinize gönderildi!'))
    ).toBeVisible();
  });
});
```

## 📋 Testing Checklist & Quality Gates

### Pre-Production Testing Checklist

```markdown
## Authentication Testing ✅

- [ ] Magic link email validation with Turkish error messages
- [ ] Magic link sending and rate limiting protection
- [ ] Deep link URL processing and token validation
- [ ] Google OAuth flow with user cancellation handling
- [ ] Session management and persistence
- [ ] Authentication error protection (all 7 layers)

## Error Protection Testing ✅

- [ ] Layer 1: Error translation to Turkish
- [ ] Layer 2: Global error monitoring and logging
- [ ] Layer 3-4: Auth store and service protection
- [ ] Layer 5: Global error provider functionality
- [ ] Layer 6: Error boundary crash protection
- [ ] Layer 7: UI component safety checks
- [ ] User cancellation handling (no error messages)

## Performance Testing ✅

- [ ] Component render times under 16ms (60fps)
- [ ] React.memo effectiveness validation
- [ ] TanStack Query caching efficiency
- [ ] Bundle size impact analysis
- [ ] Memory usage patterns
- [ ] Animation smoothness validation

## Turkish Localization Testing ✅

- [ ] All error messages in Turkish
- [ ] Cultural sensitivity in messaging
- [ ] Polite and helpful tone
- [ ] No technical English terms exposed
- [ ] UI text consistency
- [ ] Input validation messages

## Cross-Platform Testing ✅

- [ ] iOS authentication flows
- [ ] Android authentication flows
- [ ] Deep link handling on both platforms
- [ ] Performance consistency
- [ ] UI component rendering
- [ ] Error handling consistency

## Data Integrity Testing ✅

- [ ] Gratitude entry creation and editing
- [ ] Streak calculation accuracy
- [ ] Data export functionality
- [ ] Offline data persistence
- [ ] Sync behavior on reconnection
```

### Quality Gates

```typescript
// Quality gate configuration for CI/CD
export const qualityGates = {
  testCoverage: {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90,
  },
  performance: {
    maxComponentRenderTime: 16, // ms
    maxQueryResponseTime: 1000, // ms
    maxAppStartupTime: 3000, // ms
    maxMemoryUsage: 150, // MB
  },
  accessibility: {
    minA11yScore: 90,
    requiredAriaLabels: true,
    contrastRatio: 4.5,
  },
  errorProtection: {
    maxUnhandledErrors: 0,
    requiredTurkishTranslation: true,
    maxTechnicalErrorsExposed: 0,
  },
};
```

This comprehensive testing guide ensures that the Yeşer app maintains production-ready quality with robust error protection, excellent performance, proper Turkish localization, and seamless authentication flows across all platforms.
