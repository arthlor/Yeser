# Development Guide

This guide outlines the development workflow, best practices, and debugging strategies for the Yeşer gratitude app, including the **enhanced 7-layer error protection system**, **magic link authentication** development patterns, and **production-ready performance optimization** strategies.

## 🚀 Development Environment Setup

### Prerequisites (Updated)

Ensure you have completed the setup from `01-setup.md` and have:

- ✅ **Node.js 18.x** with npm/yarn
- ✅ **Expo CLI & EAS CLI** for development and builds
- ✅ **Supabase Account** with database configured and RLS policies enabled
- ✅ **Environment Variables** properly configured (`.env` file)
- ✅ **Firebase Project** with Analytics enabled for iOS and Android
- ✅ **Deep Link Configuration** for magic link authentication testing
- ✅ **Development Tools** (React Native Debugger, Flipper, VS Code extensions)

### Enhanced Development Server Startup

```bash
# Start the development server with enhanced logging
npm start

# For specific platforms with detailed logging
npm run ios -- --configuration Debug
npm run android -- --variant debug

# Start with additional debugging options
npm start -- --clear-cache --verbose

# For performance monitoring during development
npm start -- --dev-client
```

## 🔧 Development Workflow (Production-Optimized)

### 1. Feature Development with 7-Layer Protection

When developing new features, follow this enhanced workflow that includes comprehensive error protection:

```bash
# Create feature branch following naming convention
git checkout -b feature/enhanced-gratitude-display

# Start development server with monitoring
npm start

# Run development with error monitoring active
npm run dev:debug  # Custom script with enhanced logging

# Test with error simulation
npm run test:errors  # Custom script to test error boundaries
```

#### Error Protection Integration Workflow

```typescript
// 1. Component Development with Error Protection
// src/features/gratitude/components/EnhancedGratitudeCard.tsx

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorUtils';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface EnhancedGratitudeCardProps {
  entry: GratitudeEntry;
  onPress?: (entry: GratitudeEntry) => void;
}

export const EnhancedGratitudeCard: React.FC<EnhancedGratitudeCardProps> = memo(({
  entry,
  onPress,
}) => {
  const { activeTheme } = useThemeStore();

  // 2. Error-protected callback with comprehensive logging
  const handlePress = useCallback(() => {
    try {
      logger.debug('GratitudeCard press event', { entryId: entry.id });
      onPress?.(entry);
    } catch (error) {
      // Apply 7-layer error protection
      const safeMessage = safeErrorDisplay(error);
      logger.error('GratitudeCard press error:', { error, safeMessage, entryId: entry.id });

      // Error is handled safely, no user-facing error message needed
      // UI remains stable while error is logged for debugging
    }
  }, [entry, onPress]);

  // 3. Error-protected data processing
  const formattedStatements = useMemo(() => {
    try {
      return entry.statements
        .filter(statement => statement.trim().length > 0)
        .map(statement => statement.trim());
    } catch (error) {
      logger.error('Statement formatting error:', { error, entryId: entry.id });
      return ['Veri yükleniyor...']; // Fallback content
    }
  }, [entry.statements, entry.id]);

  // 4. Error boundary wrapper for component crash protection
  return (
    <ErrorBoundary fallback={<GratitudeCardErrorFallback />}>
      <TouchableOpacity onPress={handlePress} style={[styles.container, {
        backgroundColor: activeTheme.colors.surface,
        borderColor: activeTheme.colors.outline,
      }]}>
        {formattedStatements.map((statement, index) => (
          <Text key={index} style={[styles.statement, { color: activeTheme.colors.text }]}>
            {statement}
          </Text>
        ))}
      </TouchableOpacity>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  statement: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
});
```

### 2. Authentication Workflow Development

#### Magic Link Testing in Development

```bash
# Set up ngrok for deep link testing (if needed)
ngrok http 3000  # For web testing

# Test magic link flow in development
npm run test:auth:magic-link

# Test Google OAuth flow
npm run test:auth:google

# Simulate authentication errors for testing error protection
npm run test:auth:errors
```

#### Enhanced Deep Link Testing

```typescript
// Development utility for testing deep links
// src/utils/developmentUtils.ts

export const simulateDeepLink = (
  token: string,
  type: 'magic_link' | 'google_oauth' = 'magic_link'
) => {
  if (__DEV__) {
    const testUrl = `yeser://auth/callback?access_token=${token}&type=${type}`;

    logger.debug('Simulating deep link for development:', { url: testUrl, type });

    // Trigger deep link handler
    Linking.openURL(testUrl).catch((error) => {
      logger.error('Development deep link simulation failed:', error);
    });
  }
};

// Test different authentication scenarios
export const authenticationTestScenarios = {
  validMagicLink: () => simulateDeepLink('valid_test_token', 'magic_link'),
  expiredMagicLink: () => simulateDeepLink('expired_test_token', 'magic_link'),
  invalidToken: () => simulateDeepLink('invalid_token', 'magic_link'),
  googleOAuthSuccess: () => simulateDeepLink('google_test_token', 'google_oauth'),

  // Test error protection layers
  testNetworkError: () => {
    // Simulate network error during authentication
    logger.debug('Testing network error scenario');
  },

  testInvalidResponse: () => {
    // Simulate invalid server response
    logger.debug('Testing invalid response scenario');
  },
};
```

### 3. TanStack Query Development Patterns

#### Enhanced Query Development with Error Protection

```typescript
// Development hook with comprehensive error handling
// src/hooks/development/useEnhancedGratitudeQueries.ts

export const useEnhancedGratitudeQueries = (userId: string) => {
  const gratitudeQuery = useQuery({
    queryKey: queryKeys.gratitudeEntries(userId),
    queryFn: async () => {
      try {
        logger.debug('Fetching gratitude entries', { userId });
        const result = await gratitudeApi.getGratitudeEntries(userId);
        logger.debug('Gratitude entries fetched successfully', {
          count: result.length,
          userId,
        });
        return result;
      } catch (error) {
        // Enhanced error logging for development
        logger.error('Gratitude query error:', {
          error,
          userId,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Apply 7-layer error protection
        const safeMessage = safeErrorDisplay(error);
        throw new Error(safeMessage);
      }
    },
    enabled: !!userId,
    staleTime: __DEV__ ? 0 : 1 * 60 * 1000, // No cache in development for testing
    gcTime: __DEV__ ? 0 : 5 * 60 * 1000, // No persistence in development
    retry: __DEV__ ? 1 : 3, // Fewer retries in development for faster feedback
    onError: (error) => {
      // Development-specific error handling
      if (__DEV__) {
        logger.error('Query failed in development mode:', {
          queryKey: queryKeys.gratitudeEntries(userId),
          error,
        });
      }
    },
    onSuccess: (data) => {
      // Development-specific success logging
      if (__DEV__) {
        logger.debug('Query succeeded in development mode:', {
          queryKey: queryKeys.gratitudeEntries(userId),
          dataCount: data.length,
        });
      }
    },
  });

  return {
    ...gratitudeQuery,
    // Enhanced development utilities
    refetchWithLogging: () => {
      logger.debug('Manual refetch triggered', { userId });
      return gratitudeQuery.refetch();
    },
    clearCacheAndRefetch: () => {
      logger.debug('Cache cleared and refetch triggered', { userId });
      queryClient.removeQueries(queryKeys.gratitudeEntries(userId));
      return gratitudeQuery.refetch();
    },
  };
};
```

### 4. Performance Optimization in Development

#### Component Performance Monitoring

```typescript
// Development performance monitoring utility
// src/utils/performanceUtils.ts

export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  if (!__DEV__) {
    return Component;
  }

  return React.memo((props: P) => {
    const renderStart = performance.now();

    useEffect(() => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;

      if (renderTime > 16) { // Longer than 1 frame at 60fps
        logger.warn(`Slow render detected in ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          props: Object.keys(props),
        });
      } else {
        logger.debug(`${componentName} render performance:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
        });
      }
    }, [renderStart]);

    return <Component {...props} />;
  });
};

// Usage in development
export const MonitoredGratitudeCard = withPerformanceMonitoring(
  GratitudeCard,
  'GratitudeCard'
);
```

## 🐛 Enhanced Debugging Strategies

### 1. 7-Layer Error Protection Debugging

#### Error Layer Analysis Tool

```typescript
// Development debugging utility for error protection layers
// src/utils/errorDebugging.ts

export const analyzeErrorLayers = (error: unknown, context: string) => {
  if (!__DEV__) return;

  const errorAnalysis = {
    layer1_translation: 'Not applied',
    layer2_monitoring: 'Not applied',
    layer3_authStore: 'Not applied',
    layer4_authService: 'Not applied',
    layer5_globalProvider: 'Not applied',
    layer6_errorBoundary: 'Not applied',
    layer7_uiProtection: 'Not applied',
    finalMessage: 'Unknown error',
  };

  try {
    // Check if error went through translation layer
    if (typeof error === 'string' && error.includes('Turkish:')) {
      errorAnalysis.layer1_translation = 'Applied';
    }

    // Check if error was caught by monitoring
    if (error instanceof Error && error.stack?.includes('errorMonitoring')) {
      errorAnalysis.layer2_monitoring = 'Applied';
    }

    // Apply safe error display and analyze result
    const safeMessage = safeErrorDisplay(error);
    errorAnalysis.finalMessage = safeMessage;
    errorAnalysis.layer7_uiProtection = 'Applied';

    logger.debug(`Error Layer Analysis for ${context}:`, errorAnalysis);

    // Visual debugging in development
    if (__DEV__) {
      console.table(errorAnalysis);
    }
  } catch (analysisError) {
    logger.error('Error during error analysis:', analysisError);
  }
};

// Example usage in development
export const testErrorScenarios = {
  networkError: () => {
    const error = new Error('Network request failed');
    analyzeErrorLayers(error, 'Network Request');
  },

  authError: () => {
    const error = { code: 'AUTH_ERROR', message: 'Invalid credentials' };
    analyzeErrorLayers(error, 'Authentication');
  },

  googleOAuthCancellation: () => {
    const error = { code: 'USER_CANCELLED', message: 'User cancelled Google OAuth' };
    analyzeErrorLayers(error, 'Google OAuth');
  },
};
```

### 2. Authentication Debugging

#### Magic Link Development Testing

```typescript
// Enhanced authentication debugging
// src/utils/authDebugging.ts

export const authDebugUtils = {
  // Log deep link processing in detail
  logDeepLinkDetails: (url: string) => {
    if (__DEV__) {
      const urlObj = new URL(url);
      const params = Object.fromEntries(urlObj.searchParams);

      logger.debug('Deep Link Analysis:', {
        scheme: urlObj.protocol,
        host: urlObj.host,
        pathname: urlObj.pathname,
        params,
        isValidAuthCallback: url.includes('yeser://auth/callback'),
        hasAccessToken: params.access_token !== undefined,
        hasRefreshToken: params.refresh_token !== undefined,
      });
    }
  },

  // Test authentication flows with different scenarios
  simulateAuthScenarios: {
    validMagicLink: () => {
      const testUrl =
        'yeser://auth/callback?access_token=valid_test_token&refresh_token=valid_refresh_token&expires_in=3600&token_type=bearer';
      authDebugUtils.logDeepLinkDetails(testUrl);
      return testUrl;
    },

    expiredToken: () => {
      const testUrl =
        'yeser://auth/callback?error=expired_token&error_description=The%20token%20has%20expired';
      authDebugUtils.logDeepLinkDetails(testUrl);
      return testUrl;
    },

    invalidRequest: () => {
      const testUrl =
        'yeser://auth/callback?error=invalid_request&error_description=Invalid%20authentication%20request';
      authDebugUtils.logDeepLinkDetails(testUrl);
      return testUrl;
    },
  },

  // Monitor authentication state changes
  monitorAuthState: () => {
    if (__DEV__) {
      const unsubscribe = useAuthStore.subscribe(
        (state) => state.session,
        (session, prevSession) => {
          logger.debug('Auth State Change:', {
            wasAuthenticated: !!prevSession,
            isAuthenticated: !!session,
            userId: session?.user?.id,
            provider: session?.user?.app_metadata?.provider,
            timestamp: new Date().toISOString(),
          });
        }
      );

      return unsubscribe;
    }
  },
};
```

### 3. Query State Debugging

#### TanStack Query Development Tools

```typescript
// Enhanced query debugging for development
// src/utils/queryDebugging.ts

export const queryDebugUtils = {
  // Analyze query cache state
  analyzeCacheState: () => {
    if (!__DEV__) return;

    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    const cacheAnalysis = queries.map((query) => ({
      queryKey: query.queryKey,
      state: query.state.status,
      dataUpdatedAt: query.state.dataUpdatedAt,
      errorUpdatedAt: query.state.errorUpdatedAt,
      isInvalidated: query.isInvalidated(),
      isStale: query.isStale(),
      observersCount: query.getObserversCount(),
    }));

    logger.debug('Query Cache Analysis:', cacheAnalysis);

    if (__DEV__) {
      console.table(cacheAnalysis);
    }
  },

  // Monitor query performance
  monitorQueryPerformance: (queryKey: string[]) => {
    if (!__DEV__) return;

    const startTime = performance.now();

    return {
      end: (success: boolean, dataSize?: number) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        logger.debug('Query Performance:', {
          queryKey,
          duration: `${duration.toFixed(2)}ms`,
          success,
          dataSize,
          isSlowQuery: duration > 1000,
        });
      },
    };
  },

  // Test query error scenarios
  simulateQueryErrors: {
    networkError: (queryKey: string[]) => {
      queryClient.setQueryData(queryKey, () => {
        throw new Error('Simulated network error');
      });
    },

    authError: (queryKey: string[]) => {
      queryClient.setQueryData(queryKey, () => {
        throw new Error('Authentication required');
      });
    },

    validationError: (queryKey: string[]) => {
      queryClient.setQueryData(queryKey, () => {
        throw new Error('Data validation failed');
      });
    },
  },
};
```

## 🧪 Development Testing Workflows

### 1. Enhanced Error Protection Testing

```bash
# Run error protection tests
npm run test:error-protection

# Test specific error scenarios
npm run test:error-scenarios:auth
npm run test:error-scenarios:network
npm run test:error-scenarios:validation

# Test Turkish error messages
npm run test:turkish-errors
```

### 2. Authentication Testing Workflow

```bash
# Test magic link authentication
npm run test:auth:magic-link:development

# Test Google OAuth with error scenarios
npm run test:auth:google:scenarios

# Test deep link handling
npm run test:deep-links:all-scenarios

# Test authentication error protection
npm run test:auth:error-protection
```

### 3. Performance Testing in Development

```bash
# Monitor component render performance
npm run dev:performance-monitor

# Test with large datasets
npm run test:performance:large-data

# Analyze bundle size impact
npm run analyze:bundle

# Test memory usage patterns
npm run test:memory-usage
```

## 🔍 Production-Ready Development Practices

### 1. Code Quality Assurance

```bash
# Enhanced linting with performance rules
npm run lint:enhanced

# Type checking with strict mode
npm run type-check:strict

# Performance optimization verification
npm run check:performance-rules

# Error protection coverage analysis
npm run analyze:error-coverage
```

### 2. Pre-Production Testing

```bash
# Run full test suite with error protection
npm run test:full-suite

# Test authentication flows end-to-end
npm run test:auth:e2e

# Performance regression testing
npm run test:performance:regression

# Turkish localization verification
npm run test:localization:turkish
```

### 3. Development Analytics

```bash
# Monitor development metrics
npm run dev:analytics

# Track error protection effectiveness
npm run monitor:error-protection

# Analyze authentication success rates
npm run analyze:auth-success-rates

# Monitor performance metrics
npm run monitor:performance
```

## 📊 Development Monitoring & Analytics

### Enhanced Development Dashboard

The development environment includes comprehensive monitoring for:

- **7-Layer Error Protection Effectiveness**: Real-time monitoring of error handling
- **Authentication Flow Success Rates**: Magic link and Google OAuth performance
- **Query Performance Metrics**: TanStack Query optimization tracking
- **Component Render Performance**: React performance monitoring
- **Turkish Localization Coverage**: Error message localization verification
- **Memory Usage Patterns**: Performance optimization tracking
- **Bundle Size Impact**: Real-time bundle analysis

### Development Environment Features

- ✅ **Hot Reload with Error Protection**: Enhanced development server with error monitoring
- ✅ **Real-time Error Analysis**: Immediate feedback on error protection layer effectiveness
- ✅ **Authentication Flow Testing**: Comprehensive magic link and OAuth testing tools
- ✅ **Performance Monitoring**: Real-time component and query performance tracking
- ✅ **Turkish Error Testing**: Automated testing of localized error messages
- ✅ **Production Parity**: Development environment mirrors production error handling

This comprehensive development workflow ensures that the 7-layer error protection system, magic link authentication, and performance optimizations work seamlessly during development while providing extensive debugging capabilities and production-ready testing tools.
