# Development Workflow Guide

This document provides comprehensive guidelines for developing the Yeser gratitude app, including coding standards, Git workflow, debugging practices, and team collaboration protocols.

## 🛠️ Development Environment Setup

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **Yarn** package manager
- **Git** version control
- **Expo CLI** for React Native development
- **VS Code** (recommended editor)

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "expo.vscode-expo-tools",
    "ms-vscode.vscode-react-native",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-git-extension-pack",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-todo-highlight"
  ]
}
```

### Development Tools Configuration

#### VS Code Settings (.vscode/settings.json)

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "typescript": "typescriptreact",
    "javascript": "javascriptreact"
  },
  "files.exclude": {
    "node_modules": true,
    ".expo": true,
    "dist": true
  }
}
```

#### ESLint Configuration

```javascript
// eslint.config.js
module.exports = {
  extends: [
    'expo',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: [
    '@typescript-eslint',
    'react-hooks',
    'react-native'
  ],
  rules: {
    // React Native specific rules
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    
    // React hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

#### Prettier Configuration

```javascript
// .prettierrc.cjs
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

## 🔐 Authentication Workflow

### Magic Link Development & Testing

The Yeşer app uses a **passwordless authentication system** with Supabase magic links. This section covers development and testing patterns specific to the authentication flow.

#### Development Environment Setup

```bash
# Required environment variables for magic link auth
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Deep link configuration
# iOS: yeser://auth/callback
# Android: yeser://auth/callback

# Email template configuration in Supabase Dashboard:
# Settings > Auth > Email Templates > Magic Link
# Use Turkish email template with proper redirect URL
```

#### Authentication Testing Strategy

```typescript
// 1. Unit Tests - Authentication Services
describe('authService', () => {
  it('should validate email format', () => {
    expect(authService.validateEmail('invalid-email')).toBe(false);
    expect(authService.validateEmail('valid@email.com')).toBe(true);
  });

  it('should handle magic link sending', async () => {
    const result = await authService.signInWithMagicLink('test@example.com');
    expect(result.success).toBe(true);
  });
});

// 2. Integration Tests - Deep Link Handling
describe('DeepLinkHandler', () => {
  it('should process auth callback URLs', async () => {
    const testUrl = 'yeser://auth/callback?access_token=test&refresh_token=test';
    const result = await deepLinkAuthService.handleAuthCallback(testUrl);
    expect(result.success).toBe(true);
  });
});

// 3. E2E Tests - Complete Authentication Flow
describe('Authentication Flow', () => {
  it('should complete magic link authentication', async () => {
    // 1. Enter email in login screen
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('magic-link-button')).tap();
    
    // 2. Verify success message
    await expect(element(by.text('Giriş bağlantısı email adresinize gönderildi!'))).toBeVisible();
    
    // 3. Simulate deep link callback (in test environment)
    await device.openURL('yeser://auth/callback?access_token=test');
    
    // 4. Verify successful authentication
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

#### Authentication Debugging

```typescript
// Enable debug logging for authentication
import { logger } from '@/utils/debugConfig';

// Debug magic link flow
const debugMagicLink = async (email: string) => {
  logger.debug('Starting magic link flow for:', email);
  
  try {
    const result = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'yeser://auth/callback',
      },
    });
    
    logger.debug('Magic link result:', result);
  } catch (error) {
    logger.error('Magic link error:', error);
  }
};

// Debug deep link handling
const debugDeepLink = (url: string) => {
  logger.debug('Processing deep link:', url);
  
  const urlObj = new URL(url);
  const accessToken = urlObj.searchParams.get('access_token');
  const refreshToken = urlObj.searchParams.get('refresh_token');
  
  logger.debug('Extracted tokens:', { 
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken 
  });
};
```

### Authentication Error Handling

```typescript
// Comprehensive error handling for Turkish users
const handleAuthError = (error: any): string => {
  // Technical errors should be logged but not shown to users
  logger.error('Authentication error:', error);
  
  // User-friendly Turkish error messages
  if (error?.message?.includes('rate_limit')) {
    return 'Çok fazla deneme yapıldı. Lütfen bir dakika bekleyin.';
  }
  
  if (error?.message?.includes('invalid_email')) {
    return 'Geçersiz email adresi. Lütfen doğru email girin.';
  }
  
  if (error?.message?.includes('email_not_confirmed')) {
    return 'Email adresinizi onaylayın. Gelen kutunuzu kontrol edin.';
  }
  
  // Generic fallback
  return 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
};

// Never show technical error messages to users
const LoginScreen = () => {
  const [error, setError] = useState<string>('');
  
  const handleLogin = async () => {
    try {
      await authService.signInWithMagicLink(email);
    } catch (error) {
      // Log technical details for debugging
      logger.error('Login failed:', error);
      
      // Show user-friendly Turkish message
      setError(handleAuthError(error));
    }
  };
};
```

## 📝 Coding Standards

### TypeScript Guidelines

#### Interface and Type Definitions

```typescript
// ✅ Good: Clear, descriptive interface names
interface UserProfile {
  id: string;
  username: string | null;
  onboarded: boolean;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
}

// ✅ Good: Use union types for known values
type ThemeName = 'light' | 'dark';
type Environment = 'development' | 'staging' | 'production';

// ❌ Avoid: Generic names or any types
interface Data {
  value: any;
  stuff: any[];
}
```

#### Function Definitions

```typescript
// ✅ Good: Clear function signatures with proper typing
const addGratitudeStatement = async (
  date: string,
  statement: string
): Promise<GratitudeEntry | null> => {
  try {
    const result = await apiAddStatement(date, statement);
    return result;
  } catch (error) {
    console.error('Failed to add statement:', error);
    return null;
  }
};

// ✅ Good: Use proper error handling
const handleUserAction = async (action: UserAction): Promise<void> => {
  try {
    setLoading(true);
    await performAction(action);
    hapticFeedback.success();
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Unknown error');
    hapticFeedback.error();
  } finally {
    setLoading(false);
  }
};
```

#### Component Patterns

```typescript
// ✅ Good: Proper component structure
interface GratitudeCardProps {
  entry: GratitudeEntry;
  onEdit?: (entry: GratitudeEntry) => void;
  onDelete?: (entryId: string) => void;
  editable?: boolean;
}

const GratitudeCard: React.FC<GratitudeCardProps> = ({
  entry,
  onEdit,
  onDelete,
  editable = true,
}) => {
  const { theme } = useTheme();
  
  const handleEdit = useCallback(() => {
    onEdit?.(entry);
  }, [entry, onEdit]);

  return (
    <ThemedCard style={{ backgroundColor: theme.colors.surface }}>
      {/* Component content */}
    </ThemedCard>
  );
};

// ✅ Good: Export with memo for performance
export default React.memo(GratitudeCard);
```

### File Naming Conventions

```
src/
├── components/
│   ├── ThemedButton.tsx          # PascalCase for components
│   ├── GratitudeInputBar.tsx     # Descriptive component names
│   └── utils/
│       └── componentHelpers.ts   # camelCase for utilities
├── hooks/
│   ├── useAuth.ts               # camelCase starting with 'use'
│   └── useGratitudeEntries.ts   # Descriptive hook names
├── services/
│   ├── authService.ts           # camelCase ending with 'Service'
│   └── analyticsService.ts      # Clear service purpose
├── types/
│   ├── api.types.ts             # Dot notation for type files
│   └── navigation.types.ts      # Group related types
└── utils/
    ├── dateUtils.ts             # camelCase ending with 'Utils'
    └── validationHelpers.ts     # Clear utility purpose
```

### Import Organization

```typescript
// ✅ Good: Organized import structure
// 1. React and React Native imports
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';

// 2. Third-party library imports
import { supabase } from '@supabase/supabase-js';
import { z } from 'zod';

// 3. Internal imports (stores, services, etc.)
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';

// 4. Local imports (components, utils)
import ThemedButton from '@/components/ThemedButton';
import { formatDate } from '@/utils/dateUtils';

// 5. Type imports (always last)
import type { GratitudeEntry, UserProfile } from '@/types/api.types';
```

## 🔄 Git Workflow

### Branch Strategy

We follow **Git Flow** with feature branches:

```
main (production)
├── develop (integration)
    ├── feature/add-throwback-modal
    ├── feature/improve-streak-calculation
    ├── hotfix/fix-login-issue
    └── release/v1.1.0
```

### Branch Naming Conventions

```bash
# Features
feature/feature-name
feature/add-dark-theme
feature/implement-data-export

# Bug fixes
bugfix/issue-description
bugfix/fix-streak-calculation
bugfix/resolve-login-crash

# Hotfixes (critical production issues)
hotfix/critical-issue
hotfix/fix-data-loss
hotfix/security-patch

# Releases
release/v1.0.0
release/v1.1.0-beta

# Chores (maintenance, refactoring)
chore/update-dependencies
chore/refactor-api-layer
chore/improve-documentation
```

### Commit Message Guidelines

Follow **Conventional Commits** specification:

```bash
# Format: <type>[optional scope]: <description>
# [optional body]
# [optional footer(s)]

# Types:
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: code change that neither fixes bug nor adds feature
perf: performance improvement
test: adding tests
chore: maintenance tasks

# Examples:
feat(auth): add Google OAuth integration
fix(streak): correct calculation for timezone differences
docs(api): update authentication documentation
style(components): fix linting issues in ThemedButton
refactor(store): simplify gratitude store logic
perf(images): optimize image loading performance
test(api): add tests for gratitude API functions
chore(deps): update React Native to v0.73
```

### Development Workflow

#### 1. Starting New Work

```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-new-feature

# Start development
npm run dev
```

#### 2. Development Process

```bash
# Make changes and commit regularly
git add .
git commit -m "feat(component): add initial structure for new feature"

# Push to remote regularly
git push origin feature/add-new-feature

# Keep feature branch updated
git checkout develop
git pull origin develop
git checkout feature/add-new-feature
git rebase develop
```

#### 3. Code Review Process

```bash
# Before creating PR, ensure code quality
npm run lint
npm run type-check
npm run test

# Push final changes
git push origin feature/add-new-feature

# Create Pull Request to develop branch
# - Fill out PR template
# - Request reviews from team members
# - Ensure CI/CD passes
```

#### 4. Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Tested on iOS
- [ ] Tested on Android

## Screenshots/Videos
(If applicable, add screenshots or videos)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No new warnings or errors
```

## 🐛 Debugging and Development Tools

### Debugging Setup

#### React Native Debugger

```bash
# Install React Native Debugger
brew install --cask react-native-debugger

# Start debugger
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

#### Debug Configuration

```typescript
// src/utils/debugConfig.ts
export const DEBUG_CONFIG = {
  enableReduxDevTools: __DEV__,
  enableNetworkLogging: __DEV__,
  enablePerformanceMonitoring: __DEV__,
  logLevel: __DEV__ ? 'debug' : 'warn',
};

// Console logging utility
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (__DEV__ && DEBUG_CONFIG.logLevel === 'debug') {
      console.log(`🐛 DEBUG: ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.log(`ℹ️ INFO: ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠️ WARN: ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`❌ ERROR: ${message}`, ...args);
  },
};
```

### Performance Debugging

#### Component Performance

```typescript
// Performance monitoring wrapper
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    const renderStart = performance.now();
    
    useEffect(() => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      if (renderTime > 16) { // More than one frame
        logger.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    });

    return <WrappedComponent {...props} />;
  });
};

// Usage
export default withPerformanceMonitoring(GratitudeCard, 'GratitudeCard');
```

#### Memory Leak Detection

```typescript
// Hook for detecting memory leaks
export const useMemoryLeakDetection = (componentName: string) => {
  useEffect(() => {
    let isMounted = true;
    
    return () => {
      isMounted = false;
      // Check for memory leaks in development
      if (__DEV__) {
        setTimeout(() => {
          if (!isMounted) {
            logger.debug(`${componentName} unmounted cleanly`);
          }
        }, 100);
      }
    };
  }, [componentName]);
};
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "expo start --clear",
    "dev:ios": "expo start --ios",
    "dev:android": "expo start --android",
    "dev:web": "expo start --web",
    
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android",
    "build:preview": "eas build --platform all --profile preview",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "detox test",
    
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx}\"",
    
    "clean": "rm -rf node_modules && npm install",
    "clean:cache": "expo start --clear",
    "reset": "rm -rf node_modules package-lock.json && npm install"
  }
}
```

## 🧪 Testing Practices

### Testing Strategy

1. **Unit Tests**: Individual functions and components
2. **Integration Tests**: Store and API integration
3. **E2E Tests**: Critical user journeys
4. **Manual Testing**: UI/UX validation

### Test File Structure

```
__tests__/
├── components/
│   ├── ThemedButton.test.tsx
│   └── GratitudeCard.test.tsx
├── hooks/
│   └── useAuth.test.ts
├── services/
│   └── authService.test.ts
├── store/
│   └── gratitudeStore.test.ts
├── utils/
│   └── dateUtils.test.ts
└── e2e/
    ├── auth.e2e.ts
    └── gratitude.e2e.ts
```

### Testing Utilities

```typescript
// __tests__/utils/testUtils.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Custom render function with providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };
```

## 📱 Device Testing

### Testing Matrix

| Device Type | iOS Version | Android Version | Priority |
|-------------|-------------|-----------------|----------|
| iPhone 14 | iOS 16+ | - | High |
| iPhone 12 | iOS 15+ | - | Medium |
| Pixel 7 | - | Android 13+ | High |
| Samsung Galaxy | - | Android 12+ | Medium |
| iPad | iOS 16+ | - | Low |
| Android Tablet | - | Android 12+ | Low |

### Testing Checklist

#### Functionality Testing
- [ ] Authentication (Google OAuth, Email/Password)
- [ ] Gratitude entry creation and editing
- [ ] Streak calculation accuracy
- [ ] Throwback feature functionality
- [ ] Settings and preferences
- [ ] Data export functionality
- [ ] Offline functionality

#### UI/UX Testing
- [ ] Dark/Light theme switching
- [ ] Responsive design across devices
- [ ] Accessibility features
- [ ] Haptic feedback
- [ ] Loading states and error handling
- [ ] Navigation flow

#### Performance Testing
- [ ] App startup time
- [ ] Navigation smoothness
- [ ] Memory usage
- [ ] Battery consumption
- [ ] Network request efficiency

## 🚀 Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Build app
        run: eas build --platform all --non-interactive
```

## 🔧 Development Tips

### Hot Reloading

```typescript
// Enable Fast Refresh for better development experience
// metro.config.js
module.exports = {
  transformer: {
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  },
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'svg'],
  },
};
```

### Development Shortcuts

```bash
# Quick commands for common tasks
alias expo-dev="npx expo start --clear"
alias expo-ios="npx expo start --ios"
alias expo-android="npx expo start --android"
alias fix-lint="npm run lint:fix && npm run format"
alias test-watch="npm run test:watch"
```

### Debugging Network Requests

```typescript
// Network request interceptor for debugging
if (__DEV__) {
  const originalFetch = global.fetch;
  global.fetch = (...args) => {
    console.log('🌐 Network request:', args[0]);
    return originalFetch(...args).then(response => {
      console.log('📡 Network response:', response.status, response.url);
      return response;
    });
  };
}
```

---

This development workflow guide provides a comprehensive foundation for maintaining code quality, consistency, and collaboration efficiency in the Yeser gratitude app development process. 