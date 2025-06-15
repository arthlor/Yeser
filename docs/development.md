# Development Guide

## 🚀 Getting Started

This guide covers the development setup, coding standards, and best practices for the Yeser React Native gratitude journaling application.

## 📋 Prerequisites

### Required Software

- **Node.js**: v18.x or later
- **npm**: v9.x or later
- **React Native CLI**: Latest version
- **Expo CLI**: Latest version
- **Git**: Latest version

### Development Tools

- **VS Code**: Recommended IDE with extensions:
  - ES7+ React/Redux/React-Native snippets
  - TypeScript Hero
  - Prettier - Code formatter
  - ESLint
  - React Native Tools
  - GitLens

### Platform-Specific Requirements

#### iOS Development

- **Xcode**: Latest version (macOS only)
- **iOS Simulator**: Included with Xcode
- **CocoaPods**: `sudo gem install cocoapods`

#### Android Development

- **Android Studio**: Latest version
- **Android SDK**: API level 31+
- **Java Development Kit**: OpenJDK 11

## 🛠️ Project Setup

### 1. Clone Repository

```bash
git clone [repository-url]
cd yeser
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Configure required variables
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_ENV=development
```

### 4. Platform Setup

#### iOS Setup

```bash
cd ios && pod install && cd ..
```

#### Android Setup

```bash
# Ensure Android SDK is properly configured
npx react-native doctor
```

### 5. Start Development Server

```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run ios
npm run android
```

## 📐 Project Structure Deep Dive

### Architecture Layers

```
src/
├── 📱 Presentation Layer
│   ├── components/           # Shared UI components
│   ├── features/*/screens/   # Feature-specific screens
│   └── navigation/           # Navigation configuration
│
├── 🧠 Business Logic Layer
│   ├── features/*/hooks/     # Feature-specific hooks
│   ├── hooks/               # Global custom hooks
│   └── features/*/services/ # Feature business logic
│
├── 💾 Data Layer
│   ├── api/                 # API layer and configurations
│   ├── store/               # Global Zustand stores
│   ├── features/*/store/    # Feature-specific stores
│   └── services/            # Core services
│
└── 🔧 Infrastructure Layer
    ├── providers/           # React context providers
    ├── config/              # App configuration
    ├── themes/              # Theme system
    ├── types/               # TypeScript definitions
    └── utils/               # Utility functions
```

### Feature Organization

Each feature follows a consistent structure:

```
features/[feature-name]/
├── index.ts                 # Public API exports
├── components/              # Feature UI components
├── hooks/                   # Feature business logic
├── screens/                 # Navigation screens
├── services/                # API and business services
├── store/                   # State management
├── types/                   # TypeScript types
└── utils/                   # Feature utilities
```

## 🎯 Coding Standards

### TypeScript Guidelines

#### 1. Strict Type Safety

```typescript
// ✅ Required: Explicit typing
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

// ✅ Required: Function signatures
const updateProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> => {
  // Implementation
};

// ❌ Forbidden: Any types
const data: any = fetchData(); // IMMEDIATE REJECTION
```

#### 2. Import Organization

```typescript
// 1. React and React Native imports
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

// 3. Internal absolute imports (@/ alias)
import { useAuthStore } from '@/store/authStore';
import { useUserProfile } from '@/hooks/useUserProfile';

// 4. Local relative imports
import { LocalComponent } from './LocalComponent';
import { utility } from './utils/utility';

// 5. Type imports
import type { AppTheme } from '@/themes/types';
import type { Profile } from '@/types/api.types';
```

### React Native Best Practices

#### 1. Component Structure

```typescript
interface ComponentProps {
  title: string;
  onPress: (id: string) => void;
  data: ItemData[];
  isLoading?: boolean;
}

const Component: React.FC<ComponentProps> = React.memo(({
  title,
  onPress,
  data,
  isLoading = false
}) => {
  // 1. Hooks and state
  const theme = useThemeStore(state => state.theme);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 2. Memoized computations
  const processedData = useMemo(() => {
    return data.filter(item => item.isActive).sort((a, b) => a.order - b.order);
  }, [data]);

  // 3. Callbacks
  const handlePress = useCallback((id: string) => {
    setSelectedId(id);
    onPress(id);
  }, [onPress]);

  // 4. Early returns
  if (isLoading) return <LoadingState />;
  if (!data.length) return <EmptyState />;

  // 5. Render
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        {title}
      </Text>
      {processedData.map(item => (
        <ItemComponent
          key={item.id}
          data={item}
          onPress={handlePress}
          isSelected={selectedId === item.id}
        />
      ))}
    </View>
  );
});
```

#### 2. Styling Standards

```typescript
// ✅ Required: StyleSheet.create
const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  title: {
    fontSize: theme.typography.headingMd.fontSize,
    fontWeight: theme.typography.headingMd.fontWeight,
    marginBottom: theme.spacing.sm,
  },
});

// ✅ Required: Dynamic styles only when necessary
const dynamicStyles = useMemo(() => ({
  animatedView: {
    transform: [{ scale: animationValue }],
    opacity: isVisible ? 1 : 0
  }
}), [animationValue, isVisible]);

// ❌ Forbidden: Inline styles
<View style={{ backgroundColor: '#FF0000', padding: 20 }} />
```

#### 3. Hook Dependencies

```typescript
// ✅ Required: Complete dependency arrays
useEffect(() => {
  fetchData(userId, filter);
}, [userId, filter]); // All dependencies included

// ✅ Required: Memoized function dependencies
const handleSubmit = useCallback(() => {
  submitData(formData);
}, [formData]);

useEffect(() => {
  handleSubmit();
}, [handleSubmit]); // Memoized function dependency

// ❌ Forbidden: Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // Missing userId dependency - IMMEDIATE REJECTION
```

## 🗃️ State Management Patterns

### Zustand Store Creation

```typescript
interface FeatureState {
  data: FeatureData[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchData: () => Promise<void>;
  updateItem: (id: string, updates: Partial<FeatureData>) => void;
  reset: () => void;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  data: [],
  isLoading: false,
  error: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await featureApi.getData();
      set({ data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  updateItem: (id, updates) => {
    const { data } = get();
    const updatedData = data.map((item) => (item.id === id ? { ...item, ...updates } : item));
    set({ data: updatedData });
  },

  reset: () => set({ data: [], isLoading: false, error: null }),
}));
```

### TanStack Query Hooks

```typescript
export const useFeatureData = (userId: string, options?: QueryOptions) => {
  return useQuery({
    queryKey: queryKeys.feature.data(userId),
    queryFn: () => featureApi.getData(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) =>
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    ...options,
  });
};

export const useFeatureMutations = () => {
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: featureApi.createItem,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feature.data(variables.userId),
      });
    },
    onError: (error) => {
      // Error handling
    },
  });

  return { createItem };
};
```

## 🔧 Service Layer Patterns

### API Service Structure

```typescript
interface FeatureApiService {
  getData: (userId: string) => Promise<FeatureData[]>;
  getItem: (itemId: string) => Promise<FeatureData>;
  createItem: (data: CreateFeatureData) => Promise<FeatureData>;
  updateItem: (itemId: string, updates: Partial<FeatureData>) => Promise<FeatureData>;
  deleteItem: (itemId: string) => Promise<void>;
}

export const featureApiService: FeatureApiService = {
  getData: async (userId) => {
    const { data, error } = await supabase
      .from('feature_table')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch data: ${error.message}`);
    return data || [];
  },

  createItem: async (itemData) => {
    const { data, error } = await supabase
      .from('feature_table')
      .insert([itemData])
      .select()
      .single();

    if (error) throw new Error(`Failed to create item: ${error.message}`);
    return data;
  },

  // ... other methods
};
```

## 🧪 Testing Strategy

### Unit Testing

```typescript
// Component testing
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    const { getByText } = render(
      <Component title="Test Title" onPress={jest.fn()} data={[]} />
    );

    expect(getByText('Test Title')).toBeTruthy();
  });

  it('should handle press events', async () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Component title="Test" onPress={onPress} data={mockData} />
    );

    fireEvent.press(getByText('Item 1'));

    await waitFor(() => {
      expect(onPress).toHaveBeenCalledWith('item-1');
    });
  });
});

// Hook testing
import { renderHook, act } from '@testing-library/react-hooks';
import { useFeatureStore } from './featureStore';

describe('useFeatureStore', () => {
  it('should update data correctly', () => {
    const { result } = renderHook(() => useFeatureStore());

    act(() => {
      result.current.updateItem('item-1', { name: 'Updated Name' });
    });

    expect(result.current.data[0].name).toBe('Updated Name');
  });
});
```

## 🚀 Build and Deployment

### Development Builds

```bash
# Local development
npm start

# Development build for testing
npm run build:dev

# Preview build for internal testing
npm run build:preview
```

### Production Builds

```bash
# Production build for app stores
npm run build:production

# Platform-specific production builds
npm run build:production:android
npm run build:production:ios
```

### Environment Management

```bash
# Validate environment variables
npm run validate-env:dev
npm run validate-env:preview
npm run validate-env:prod

# Test production configuration
npm run test:production
```

## 🔍 Debugging and Performance

### Development Tools

```typescript
// Debug configuration
import { logger } from '@/utils/debugConfig';

// Use logger instead of console.log
logger.debug('Debug message', { data });
logger.error('Error occurred', error);
logger.warn('Warning message', { context });
```

### Performance Monitoring

```typescript
// Performance tracking
import { analyticsService } from '@/services/analyticsService';

// Track screen performance
const screenStartTime = Date.now();

useEffect(() => {
  const loadTime = Date.now() - screenStartTime;
  analyticsService.logEvent('screen_load_time', {
    screen: 'HomeScreen',
    loadTime,
  });
}, []);
```

### Memory Management

```typescript
// Proper cleanup
useEffect(() => {
  const subscription = eventEmitter.subscribe('event', handler);
  const timer = setInterval(updateFunction, 1000);

  return () => {
    subscription.unsubscribe();
    clearInterval(timer);
  };
}, []);
```

## 📊 Code Quality

### ESLint Configuration

```javascript
module.exports = {
  rules: {
    // Performance enforcement
    'react-hooks/exhaustive-deps': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'react-native/no-inline-styles': 'error',
    '@typescript-eslint/no-unused-vars': 'error',

    // Code quality
    'no-console': 'warn',
    'prefer-const': 'error',
    'import/order': 'error',
  },
};
```

### Pre-commit Hooks

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## 🔄 Git Workflow

### Branch Naming Convention

- `feature/feature-description`
- `bugfix/issue-description`
- `hotfix/critical-issue`
- `chore/maintenance-task`

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes following coding standards
3. Write/update tests
4. Update documentation
5. Create pull request with clear description
6. Address review feedback
7. Merge after approval

## 📈 Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm run test:bundle

# Generate quality report
npm run quality:report
```

### Performance Checklist

- [ ] Zero `any` types
- [ ] No inline styles
- [ ] Complete hook dependencies
- [ ] Memoized expensive computations
- [ ] Optimized images and assets
- [ ] Proper error boundaries
- [ ] Clean component unmounting

This development guide ensures consistent, high-quality code that follows the established architecture patterns and performance optimizations of the Yeser application.
