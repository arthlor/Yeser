# Development Guide

> Complete guide to developing and maintaining the Yeser gratitude journaling app.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ with npm or yarn
- **Expo CLI** 2.0+ (`npm install -g @expo/cli`)
- **EAS CLI** (`npm install -g eas-cli`)
- **Git** for version control
- **iOS Simulator** (macOS) and/or **Android Emulator**
- **Supabase Account** for backend services

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd yeser

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables (see Environment Setup)
# Edit .env with your values

# Start development server
npm run start:dev
```

## 🔧 Environment Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth (optional)
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id

# App Configuration
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_REDIRECT_URI=yeser-dev://auth/callback

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_THROWBACK=true
```

### Supabase Setup

1. **Create Supabase Project**

   ```bash
   # Visit https://supabase.com/dashboard
   # Create new project
   # Note your project URL and anon key
   ```

2. **Database Schema**

   ```sql
   -- Run these SQL commands in Supabase SQL Editor

   -- Create profiles table
   CREATE TABLE public.profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     username TEXT,
     onboarded BOOLEAN DEFAULT false,
     reminder_enabled BOOLEAN DEFAULT false,
     reminder_time TIME DEFAULT '09:00:00',
     throwback_reminder_enabled BOOLEAN DEFAULT false,
     throwback_reminder_frequency TEXT DEFAULT 'disabled',
     throwback_reminder_time TIME DEFAULT '19:00:00',
     daily_gratitude_goal INTEGER DEFAULT 3,
     use_varied_prompts BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Create gratitude_entries table
   CREATE TABLE public.gratitude_entries (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     entry_date DATE NOT NULL,
     statements JSONB NOT NULL DEFAULT '[]'::jsonb,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id, entry_date)
   );

   -- Create streaks table
   CREATE TABLE public.streaks (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
     current_streak INTEGER DEFAULT 0,
     longest_streak INTEGER DEFAULT 0,
     last_entry_date DATE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

   -- Create RLS policies
   CREATE POLICY "Users can only access their own profile"
   ON public.profiles FOR ALL USING (auth.uid() = id);

   CREATE POLICY "Users can only access their own entries"
   ON public.gratitude_entries FOR ALL USING (auth.uid() = user_id);

   CREATE POLICY "Users can only access their own streaks"
   ON public.streaks FOR ALL USING (auth.uid() = user_id);
   ```

3. **RPC Functions**
   ```sql
   -- Add the RPC functions from docs/architecture.md
   -- Including: add_gratitude_statement, edit_gratitude_statement, etc.
   ```

### Google OAuth Setup (Optional)

1. **Google Cloud Console**

   ```bash
   # Visit https://console.cloud.google.com/
   # Create new project or select existing
   # Enable Google+ API
   # Create OAuth 2.0 credentials for each platform
   ```

2. **iOS Configuration**

   ```javascript
   // app.config.js
   ios: {
     bundleIdentifier: "com.arthlor.yeser",
     googleServicesFile: "./google-services/GoogleService-Info.plist"
   }
   ```

3. **Android Configuration**
   ```javascript
   // app.config.js
   android: {
     package: "com.arthlor.yeser",
     googleServicesFile: "./google-services/google-services.json"
   }
   ```

## 📱 Development Workflow

### Available Scripts

```bash
# Development
npm run start:dev          # Start development server
npm run android           # Run on Android emulator
npm run ios              # Run on iOS simulator
npm run web              # Run on web browser

# Code Quality
npm run lint             # Run ESLint with auto-fix
npm run lint:check       # Check linting without fixes
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking

# Environment-specific builds
npm run build:dev        # Development build (local)
npm run build:preview    # Preview build (staging)
npm run build:production # Production build

# Validation
npm run validate:env     # Check environment configuration
npm run validate:build   # Full validation before build
```

### File Structure Convention

```
src/
├── features/           # Business logic organized by feature
│   ├── auth/          # Authentication system
│   │   ├── components/ # Auth-specific components
│   │   ├── hooks/     # Auth-specific hooks
│   │   ├── screens/   # Auth screens
│   │   ├── services/  # Auth business logic
│   │   ├── store/     # Auth state management
│   │   └── types/     # Auth type definitions
│   ├── gratitude/     # Core gratitude functionality
│   ├── calendar/      # Calendar and timeline views
│   ├── settings/      # App settings and preferences
│   └── ...           # Other features
├── shared/            # Shared utilities and components
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   └── utils/         # Utility functions
├── api/              # API layer and data fetching
├── services/         # Business logic services
├── store/           # Global state management
├── themes/          # Design system and themes
├── types/           # Global TypeScript types
├── utils/           # Utility functions
└── schemas/         # Zod validation schemas
```

## 📋 Coding Standards

### TypeScript Standards

```typescript
// ✅ REQUIRED: Explicit typing (no 'any' types allowed)
interface UserProfile {
  id: string;
  username: string | null;
  onboarded: boolean;
}

// ✅ REQUIRED: Function parameter and return typing
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  // Implementation
};

// ✅ REQUIRED: Proper error handling
try {
  const profile = await fetchUserProfile(userId);
  return profile;
} catch (error) {
  logger.error('Failed to fetch profile:', error as Error);
  throw error;
}
```

### React Component Standards

```typescript
// ✅ REQUIRED: Memoized functional components
interface ProfileCardProps {
  profile: UserProfile;
  onEdit: (id: string) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = React.memo(({
  profile,
  onEdit
}) => {
  // ✅ REQUIRED: Memoized callbacks
  const handleEdit = useCallback(() => {
    onEdit(profile.id);
  }, [onEdit, profile.id]);

  // ✅ REQUIRED: Memoized computed values
  const displayName = useMemo(() => {
    return profile.username || 'Anonymous User';
  }, [profile.username]);

  return (
    <ThemedCard style={styles.container}>
      <Text style={styles.name}>{displayName}</Text>
      <ThemedButton onPress={handleEdit} title="Edit" />
    </ThemedCard>
  );
});

// ✅ REQUIRED: StyleSheet.create (no inline styles)
const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

### Import Organization

```typescript
// ✅ REQUIRED: Import order (critical for performance)

// 1. React and React Native core
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

// 3. Internal absolute imports (@ alias)
import { useAuthStore } from '@/store/authStore';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { gratitudeApi } from '@/api/gratitudeApi';

// 4. Local relative imports
import { LocalComponent } from './LocalComponent';
import { localUtil } from './utils/localUtil';

// 5. Type imports (separate)
import type { AppTheme } from '@/themes/types';
import type { Profile } from '@/types/api.types';
```

### Performance Requirements

```typescript
// ✅ REQUIRED: Hook dependency arrays (no exceptions)
useEffect(() => {
  fetchData(userId, options);
}, [userId, options]); // All dependencies included

// ✅ REQUIRED: Memoized expensive computations
const processedData = useMemo(() => {
  return data.filter(item => item.isActive)
            .sort((a, b) => a.order - b.order);
}, [data]); // Always include dependencies

// ❌ FORBIDDEN: Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // Missing userId - causes infinite loops

// ❌ FORBIDDEN: Inline styles (15% performance cost)
<View style={{ backgroundColor: 'red', padding: 20 }} />

// ✅ REQUIRED: StyleSheet.create
const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
  },
});
```

## 🧪 Testing Strategy

### Test Structure

```
src/
├── __tests__/          # Unit tests
├── components/
│   └── __tests__/      # Component tests
├── hooks/
│   └── __tests__/      # Hook tests
├── services/
│   └── __tests__/      # Service tests
└── utils/
    └── __tests__/      # Utility tests
```

### Unit Testing Example

```typescript
// src/hooks/__tests__/useGratitudeEntry.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGratitudeEntry } from '../useGratitudeEntry';

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

describe('useGratitudeEntry', () => {
  it('should fetch gratitude entry for given date', async () => {
    const { result } = renderHook(
      () => useGratitudeEntry('2024-01-01'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Component Testing Example

```typescript
// src/components/__tests__/GratitudeInputBar.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GratitudeInputBar } from '../GratitudeInputBar';

describe('GratitudeInputBar', () => {
  it('should call onSubmit when text is entered and submitted', () => {
    const mockOnSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <GratitudeInputBar onSubmit={mockOnSubmit} />
    );

    const input = getByPlaceholderText('Bugün neye minnettarsın?');
    const submitButton = getByText('Ekle');

    fireEvent.changeText(input, 'Test gratitude statement');
    fireEvent.press(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('Test gratitude statement');
  });
});
```

## 🔍 Debugging & Development Tools

### Debug Configuration

```typescript
// src/utils/debugConfig.ts
export const logger = {
  debug: (message: string, extra?: object) => {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, extra);
    }
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, extra?: object) => {
    console.warn(`[WARN] ${message}`, extra);
  },
};
```

### TanStack Query DevTools

```typescript
// App.tsx - Add in development
import { QueryClient } from '@tanstack/react-query';
import { TanStackQueryDevtools } from '@tanstack/react-query-devtools';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      {__DEV__ && <TanStackQueryDevtools />}
    </QueryClientProvider>
  );
}
```

### Flipper Integration

```typescript
// src/utils/flipperConfig.ts
import { logger } from 'react-native-logs';

const config = {
  severity: __DEV__ ? 'debug' : 'error',
  transport: __DEV__ ? logger.consoleTransport : logger.fileAsyncTransport,
  transportOptions: {
    colors: {
      info: 'blueBright',
      warn: 'yellowBright',
      error: 'redBright',
    },
  },
};

export const log = logger.createLogger(config);
```

## 🏗 Build & Deployment

### EAS Build Configuration

```javascript
// eas.json
{
  "cli": {
    "version": ">= 2.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "bundleIdentifier": "com.arthlor.yeser.preview"
      },
      "android": {
        "applicationId": "com.arthlor.yeser.preview"
      }
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Build Commands

```bash
# Development builds (local testing)
npm run build:dev:ios       # iOS development build
npm run build:dev:android   # Android development build

# Preview builds (internal testing)
npm run build:preview       # Both platforms
eas build --platform ios --profile preview

# Production builds
npm run build:production    # Both platforms
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### Environment-Specific Configuration

```javascript
// app.config.js
export default ({ config }) => {
  const env = process.env.EXPO_PUBLIC_ENV || 'development';

  const baseConfig = {
    ...config,
    name: env === 'production' ? 'Yeser' : `Yeser (${env})`,
    slug: 'yeser',
    scheme: env === 'development' ? 'yeser-dev' : env === 'preview' ? 'yeser-preview' : 'yeser',
  };

  if (env === 'development') {
    baseConfig.ios.bundleIdentifier = 'com.arthlor.yeser.dev';
    baseConfig.android.package = 'com.arthlor.yeser.dev';
  } else if (env === 'preview') {
    baseConfig.ios.bundleIdentifier = 'com.arthlor.yeser.preview';
    baseConfig.android.package = 'com.arthlor.yeser.preview';
  }

  return baseConfig;
};
```

## 🔄 State Management Patterns

### TanStack Query Setup

```typescript
// src/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});
```

### Custom Hook Pattern

```typescript
// src/hooks/useGratitudeEntry.ts
export const useGratitudeEntry = (date: string) => {
  return useQuery({
    queryKey: queryKeys.gratitude.entry(date),
    queryFn: () => gratitudeApi.getGratitudeDailyEntryByDate(date),
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGratitudeMutations = () => {
  const queryClient = useQueryClient();

  const addStatement = useMutation({
    mutationFn: gratitudeApi.addStatement,
    onSuccess: (data, variables) => {
      // Optimistic update
      queryClient.setQueryData(queryKeys.gratitude.entry(variables.entryDate), data);

      // Invalidate related queries
      queryClient.invalidateQueries(queryKeys.gratitude.entries());
      queryClient.invalidateQueries(queryKeys.streaks.current());
    },
  });

  return { addStatement };
};
```

## 🚨 Common Issues & Solutions

### Metro Bundle Issues

```bash
# Clear Metro cache
npx expo start --clear

# Reset package manager cache
npm start -- --reset-cache

# Clear all caches
rm -rf node_modules/.cache
rm -rf .expo
npm install
```

### TypeScript Issues

```bash
# Type checking
npm run type-check

# Generate types for Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.types.ts
```

### Performance Debugging

```typescript
// Enable performance monitoring in development
import { enableScreens } from 'react-native-screens';
import { enableFreeze } from 'react-native-screens';

if (__DEV__) {
  enableScreens(true);
  enableFreeze(true);

  // Monitor re-renders
  require('@welldone-software/why-did-you-render').default(React, {
    trackAllPureComponents: true,
  });
}
```

## 📚 Additional Resources

### Documentation Links

- [React Native Performance](https://reactnative.dev/docs/performance)
- [TanStack Query](https://tanstack.com/query/latest)
- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

### Development Tools

- **VS Code Extensions**

  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - TypeScript Importer
  - Auto Rename Tag

- **Debugging Tools**
  - React Native Debugger
  - Flipper
  - TanStack Query DevTools
  - Expo DevTools

This development guide ensures consistent, high-quality development practices across the team while maintaining the performance standards achieved in the Yeser codebase.
