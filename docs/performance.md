# Performance Optimization

> Comprehensive guide to React Native performance best practices and optimization strategies for Yeser.

## ⚡ Overview

Performance optimization in Yeser focuses on:

- **Render Performance** - Efficient component rendering and re-rendering prevention
- **Memory Management** - Optimal memory usage and leak prevention
- **Bundle Optimization** - Minimizing app size and load times
- **Network Efficiency** - Smart data fetching and caching strategies
- **Native Performance** - Leveraging native optimizations and avoiding JavaScript bottlenecks

## 🎯 Core Performance Principles

### 1. Zero Inline Styles Policy

**Critical**: Inline styles cause 15% performance degradation.

```typescript
// ❌ FORBIDDEN: Inline styles (IMMEDIATE REJECTION)
<View style={{ backgroundColor: '#FF0000', padding: 20 }} />
<Animated.View style={{ transform: [{ scale: scaleValue }] }} />

// ✅ REQUIRED: StyleSheet.create for all static styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
  },
});

// ✅ REQUIRED: Memoized dynamic styles ONLY when necessary
const dynamicStyles = useMemo(() => ({
  animatedView: {
    transform: [{ scale: animationValue }],
    opacity: isVisible ? 1 : 0
  }
}), [animationValue, isVisible]);
```

### 2. Strict Hook Dependency Management

**Critical**: Missing dependencies cause infinite loops.

```typescript
// ❌ FORBIDDEN: Missing dependencies (IMMEDIATE REJECTION)
useEffect(() => {
  fetchData(userId);
}, []); // Missing userId dependency

// ❌ FORBIDDEN: Commented out dependencies (IMMEDIATE REJECTION)
useEffect(
  () => {
    fetchData(userId);
  },
  [
    /* userId */
  ]
); // Never comment out dependencies

// ✅ REQUIRED: Complete dependency arrays
useEffect(() => {
  fetchData(userId);
}, [userId]); // All dependencies included

// ✅ REQUIRED: Function dependencies properly memoized
const handleSubmit = useCallback(() => {
  submitData(formData);
}, [formData]);

useEffect(() => {
  handleSubmit();
}, [handleSubmit]); // Memoized function dependency
```

### 3. Component Memoization Strategy

```typescript
// ✅ REQUIRED: Memoized component with performance optimization
const GratitudeEntryItem: React.FC<Props> = React.memo(({
  entry,
  onPress,
  isSelected
}) => {
  // ✅ REQUIRED: Memoize expensive operations
  const processedStatements = useMemo(() => {
    return entry.statements
      .filter(statement => statement.trim().length > 0)
      .slice(0, 3); // Only show first 3 statements
  }, [entry.statements]);

  // ✅ REQUIRED: Memoize callbacks
  const handlePress = useCallback(() => {
    onPress(entry.id);
  }, [onPress, entry.id]);

  // ✅ REQUIRED: Early returns for performance
  if (!entry.statements.length) return <EmptyEntryItem />;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {processedStatements.map((statement, index) => (
        <Text key={index} style={styles.statement}>
          {statement}
        </Text>
      ))}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for complex props
  return (
    prevProps.entry.id === nextProps.entry.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.entry.updated_at === nextProps.entry.updated_at
  );
});
```

## 📊 Bundle Size Optimization

### Import Analysis & Cleanup

**Critical**: Unused imports cause 72% bundle bloat.

```typescript
// ❌ FORBIDDEN: Unused imports (IMMEDIATE REJECTION)
import { ScrollView, Platform, Alert, Dimensions } from 'react-native'; // Only using View
import { StackNavigationProp, RouteProp } from '@react-navigation/native'; // Unused
import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query'; // Only using useQuery

// ✅ REQUIRED: Only import what you use
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
```

### Tree Shaking Configuration

```javascript
// metro.config.cjs - Tree shaking configuration
module.exports = {
  transformer: {
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
  },
  resolver: {
    alias: {
      '@': './src',
    },
  },
  // Enable hermes for better performance
  transformer: {
    hermesCommand: 'hermes',
    enableHermes: true,
  },
};

// babel.config.cjs - Dead code elimination
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Remove console.log in production
    ['transform-remove-console', { exclude: ['error', 'warn'] }],
    // Tree shaking for lodash
    ['babel-plugin-lodash'],
    // Import optimization
    [
      'babel-plugin-transform-imports',
      {
        '@tanstack/react-query': {
          transform: '@tanstack/react-query/${member}',
          preventFullImport: true,
        },
      },
    ],
  ],
};
```

### Bundle Analysis Tools

```typescript
// Bundle analysis utilities
class BundleAnalyzer {
  static async analyzeBundle(): Promise<BundleStats> {
    // This would integrate with Metro bundle analyzer
    const bundleSize = await this.getBundleSize();
    const dependencies = await this.getDependencyTree();
    const duplicates = await this.findDuplicates();

    return {
      totalSize: bundleSize,
      dependencies,
      duplicates,
      recommendations: this.generateRecommendations(dependencies, duplicates),
    };
  }

  private static generateRecommendations(
    dependencies: Dependency[],
    duplicates: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for large dependencies
    const largeDeps = dependencies.filter((dep) => dep.size > 500000); // 500KB
    if (largeDeps.length > 0) {
      recommendations.push(`Large dependencies found: ${largeDeps.map((d) => d.name).join(', ')}`);
    }

    // Check for duplicates
    if (duplicates.length > 0) {
      recommendations.push(`Duplicate dependencies: ${duplicates.join(', ')}`);
    }

    return recommendations;
  }
}
```

## 🚀 Render Performance

### FlatList Optimization

```typescript
// Optimized FlatList implementation
interface OptimizedFlatListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  onEndReached?: () => void;
  estimatedItemSize?: number;
}

const OptimizedFlatList = <T,>({
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  estimatedItemSize = 100,
}: OptimizedFlatListProps<T>): React.ReactElement => {
  const { height } = useScreenSize();

  // Calculate optimal batch sizes based on screen size
  const batchConfig = useMemo(() => {
    const itemsPerScreen = Math.ceil(height / estimatedItemSize);
    return {
      initialNumToRender: itemsPerScreen * 2,
      maxToRenderPerBatch: itemsPerScreen,
      windowSize: 10, // Number of screens to keep in memory
      updateCellsBatchingPeriod: 100, // Batch updates for better performance
    };
  }, [height, estimatedItemSize]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}

      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={batchConfig.maxToRenderPerBatch}
      initialNumToRender={batchConfig.initialNumToRender}
      windowSize={batchConfig.windowSize}
      updateCellsBatchingPeriod={batchConfig.updateCellsBatchingPeriod}

      // Memory optimizations
      getItemLayout={(data, index) => ({
        length: estimatedItemSize,
        offset: estimatedItemSize * index,
        index,
      })}

      // Prevent unnecessary re-renders
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    />
  );
};
```

### Image Optimization

```typescript
// Optimized image component
interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  placeholder?: string;
  fadeDuration?: number;
}

const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  source,
  style,
  resizeMode = 'cover',
  placeholder,
  fadeDuration = 200,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: fadeDuration,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, fadeDuration]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (hasError) {
    return (
      <View style={[style, styles.errorContainer]}>
        <Text style={styles.errorText}>📷</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      {isLoading && placeholder && (
        <Image
          source={{ uri: placeholder }}
          style={[StyleSheet.absoluteFillObject, styles.placeholder]}
          resizeMode={resizeMode}
        />
      )}

      <Animated.Image
        source={source}
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: fadeAnim },
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        // Enable native optimizations
        progressiveRenderingEnabled={true}
        defaultSource={placeholder ? { uri: placeholder } : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    fontSize: 24,
    opacity: 0.5,
  },
  placeholder: {
    opacity: 0.3,
  },
});
```

## 💾 Memory Management

### Memory Leak Prevention

```typescript
// Memory leak prevention utilities
class MemoryManager {
  private static subscriptions = new Set<() => void>();
  private static timers = new Set<NodeJS.Timeout>();
  private static animations = new Set<Animated.CompositeAnimation>();

  // Register cleanup functions
  static registerCleanup(cleanup: () => void): void {
    this.subscriptions.add(cleanup);
  }

  // Register timers for cleanup
  static registerTimer(timer: NodeJS.Timeout): void {
    this.timers.add(timer);
  }

  // Register animations for cleanup
  static registerAnimation(animation: Animated.CompositeAnimation): void {
    this.animations.add(animation);
  }

  // Clean up all registered resources
  static cleanup(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        logger.warn('Error during subscription cleanup:', error);
      }
    });
    this.subscriptions.clear();

    // Clear timers
    this.timers.forEach(timer => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.timers.clear();

    // Stop animations
    this.animations.forEach(animation => {
      animation.stop();
    });
    this.animations.clear();
  }
}

// Hook for automatic cleanup
export const useCleanup = () => {
  useEffect(() => {
    return () => {
      MemoryManager.cleanup();
    };
  }, []);

  const registerCleanup = useCallback((cleanup: () => void) => {
    MemoryManager.registerCleanup(cleanup);
  }, []);

  return { registerCleanup };
};

// Component wrapper for memory management
export const withMemoryManagement = <P extends {}>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return React.memo((props: P) => {
    useCleanup();
    return <Component {...props} />;
  });
};
```

### Efficient State Management

```typescript
// Batched state updates for performance
export const useBatchedState = <T>(
  initialState: T,
  batchDelay: number = 16 // One frame at 60fps
): [T, (updater: (prev: T) => T) => void] => {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<((prev: T) => T)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchedSetState = useCallback(
    (updater: (prev: T) => T) => {
      pendingUpdates.current.push(updater);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setState((prev) => {
          let newState = prev;
          pendingUpdates.current.forEach((update) => {
            newState = update(newState);
          });
          pendingUpdates.current = [];
          return newState;
        });
      }, batchDelay);
    },
    [batchDelay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchedSetState];
};

// Optimized selector hook
export const useOptimizedSelector = <T, R>(
  selector: (state: T) => R,
  equalityFn?: (prev: R, next: R) => boolean
): R => {
  const [selectedState, setSelectedState] = useState<R>(
    () => selector({} as T) // Initial placeholder
  );

  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);

  // Update refs without causing re-renders
  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;

  const updateState = useCallback(
    (newState: T) => {
      const newSelectedState = selectorRef.current(newState);

      if (equalityFnRef.current) {
        if (!equalityFnRef.current(selectedState, newSelectedState)) {
          setSelectedState(newSelectedState);
        }
      } else if (selectedState !== newSelectedState) {
        setSelectedState(newSelectedState);
      }
    },
    [selectedState]
  );

  return selectedState;
};
```

## 🌐 Network Performance

### Smart Caching Strategy

```typescript
// Advanced caching configuration for TanStack Query
const queryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,

      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },

      // Background refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
};

// Optimistic updates with rollback
export const useOptimisticGratitudeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gratitudeApi.createGratitudeEntry,

    // Optimistic update
    onMutate: async (newEntry) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.gratitude.today() });

      // Snapshot the previous value
      const previousEntry = queryClient.getQueryData(queryKeys.gratitude.today());

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.gratitude.today(), newEntry);

      // Return a context object with the snapshotted value
      return { previousEntry };
    },

    // Rollback on error
    onError: (err, newEntry, context) => {
      if (context?.previousEntry) {
        queryClient.setQueryData(queryKeys.gratitude.today(), context.previousEntry);
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gratitude.today() });
    },
  });
};
```

### Request Batching

```typescript
// Batch multiple API requests
class RequestBatcher {
  private static batches = new Map<
    string,
    {
      requests: Array<{ id: string; resolve: Function; reject: Function }>;
      timer: NodeJS.Timeout;
    }
  >();

  static batchRequest<T>(
    batchKey: string,
    requestId: string,
    batchFn: (ids: string[]) => Promise<T[]>,
    delay: number = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(batchKey);

      if (!batch) {
        batch = {
          requests: [],
          timer: setTimeout(() => this.executeBatch(batchKey, batchFn), delay),
        };
        this.batches.set(batchKey, batch);
      }

      batch.requests.push({ id: requestId, resolve, reject });
    });
  }

  private static async executeBatch<T>(
    batchKey: string,
    batchFn: (ids: string[]) => Promise<T[]>
  ): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);

    try {
      const ids = batch.requests.map((req) => req.id);
      const results = await batchFn(ids);

      batch.requests.forEach((request, index) => {
        request.resolve(results[index]);
      });
    } catch (error) {
      batch.requests.forEach((request) => {
        request.reject(error);
      });
    }
  }
}

// Usage example
const useBatchedUserProfiles = (userIds: string[]) => {
  return useQuery({
    queryKey: ['users', 'batch', userIds.sort().join(',')],
    queryFn: () =>
      RequestBatcher.batchRequest('user-profiles', userIds.join(','), (ids) =>
        userApi.getMultipleProfiles(ids.flatMap((id) => id.split(',')))
      ),
    enabled: userIds.length > 0,
  });
};
```

## 📱 Native Performance

### Native Module Optimization

```typescript
// Native performance utilities
class NativePerformance {
  // Optimize JavaScript bridge calls
  static batchBridgeCalls<T>(calls: Array<() => Promise<T>>, batchSize: number = 5): Promise<T[]> {
    const batches: Array<Array<() => Promise<T>>> = [];

    for (let i = 0; i < calls.length; i += batchSize) {
      batches.push(calls.slice(i, i + batchSize));
    }

    return batches.reduce(
      async (acc, batch) => {
        const results = await acc;
        const batchResults = await Promise.all(batch.map((call) => call()));
        return [...results, ...batchResults];
      },
      Promise.resolve([] as T[])
    );
  }

  // Optimize heavy computations
  static async runOnBackgroundThread<T>(
    computation: () => T,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const priorityLevel = {
        low: 0,
        normal: 1,
        high: 2,
      }[priority];

      // Use MessageChannel for better performance
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      // Post computation to worker thread
      channel.port2.postMessage({
        computation: computation.toString(),
        priority: priorityLevel,
      });
    });
  }
}

// Optimized animations using native driver
export const useNativeAnimations = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const fadeIn = useCallback(
    (duration: number = 250) => {
      return Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true, // Critical for 60fps animations
        easing: Easing.out(Easing.ease),
      });
    },
    [fadeAnim]
  );

  const scalePress = useCallback(() => {
    return Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);
  }, [scaleAnim]);

  return {
    fadeAnim,
    scaleAnim,
    fadeIn,
    scalePress,
  };
};
```

## 📊 Performance Monitoring

### Runtime Performance Tracking

```typescript
// Performance monitoring service
class PerformanceMonitor {
  private static metrics = new Map<string, PerformanceMetric>();

  // Track render performance
  static startRenderMeasurement(componentName: string): string {
    const id = `${componentName}-${Date.now()}`;
    this.metrics.set(id, {
      type: 'render',
      componentName,
      startTime: performance.now(),
    });
    return id;
  }

  static endRenderMeasurement(id: string): void {
    const metric = this.metrics.get(id);
    if (!metric) return;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log slow renders
    if (metric.duration > 16) {
      // 16ms = 60fps threshold
      logger.warn(`Slow render detected: ${metric.componentName} took ${metric.duration}ms`);
    }

    // Track in analytics
    analyticsService.logEvent('performance_render', {
      component: metric.componentName,
      duration: metric.duration,
      isSlowRender: metric.duration > 16,
    });

    this.metrics.delete(id);
  }

  // Track memory usage
  static async trackMemoryUsage(): Promise<MemoryInfo> {
    const memoryInfo = (await NativeModules.MemoryInfo?.getMemoryInfo()) || {
      totalMemory: 0,
      freeMemory: 0,
      usedMemory: 0,
    };

    // Log memory warnings
    const usagePercentage = (memoryInfo.usedMemory / memoryInfo.totalMemory) * 100;
    if (usagePercentage > 80) {
      logger.warn(`High memory usage: ${usagePercentage.toFixed(1)}%`);
    }

    return memoryInfo;
  }

  // Track navigation performance
  static trackNavigationTiming(screenName: string, navigationTime: number): void {
    analyticsService.logEvent('performance_navigation', {
      screen: screenName,
      duration: navigationTime,
      isSlowNavigation: navigationTime > 300,
    });
  }
}

// Hook for component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const renderIdRef = useRef<string>();

  useEffect(() => {
    renderIdRef.current = PerformanceMonitor.startRenderMeasurement(componentName);

    return () => {
      if (renderIdRef.current) {
        PerformanceMonitor.endRenderMeasurement(renderIdRef.current);
      }
    };
  });

  const trackCustomMetric = useCallback(
    (metricName: string, value: number) => {
      analyticsService.logEvent('performance_custom', {
        component: componentName,
        metric: metricName,
        value,
      });
    },
    [componentName]
  );

  return { trackCustomMetric };
};
```

## 🔧 Performance Tools & Scripts

### Build-time Optimization

```bash
#!/bin/bash
# Performance optimization script

echo "🚀 Running performance optimizations..."

# 1. Bundle analysis
echo "📊 Analyzing bundle size..."
npx react-native-bundle-visualizer --platform android --dev false --format html

# 2. Check for duplicate dependencies
echo "🔍 Checking for duplicate dependencies..."
npx yarn-deduplicate yarn.lock

# 3. Optimize images
echo "🖼️ Optimizing images..."
find ./src/assets -name "*.png" -exec pngquant --force --output {} {} \;

# 4. Run performance tests
echo "🧪 Running performance tests..."
npm run test:performance

# 5. Generate performance report
echo "📈 Generating performance report..."
node scripts/performance-report.js

echo "✅ Performance optimization complete!"
```

### Performance Testing

```typescript
// Performance test utilities
describe('Performance Tests', () => {
  test('Component render time should be under 16ms', async () => {
    const renderTimes: number[] = [];

    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();

      const { unmount } = render(
        <GratitudeEntryItem
          entry={mockEntry}
          onPress={() => {}}
          isSelected={false}
        />
      );

      const endTime = performance.now();
      renderTimes.push(endTime - startTime);

      unmount();
    }

    const avgRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;
    expect(avgRenderTime).toBeLessThan(16); // 60fps = 16.67ms per frame
  });

  test('Memory usage should not exceed threshold', async () => {
    const initialMemory = await PerformanceMonitor.trackMemoryUsage();

    // Simulate heavy operations
    for (let i = 0; i < 1000; i++) {
      render(<ComplexComponent data={generateMockData()} />);
    }

    const finalMemory = await PerformanceMonitor.trackMemoryUsage();
    const memoryIncrease = finalMemory.usedMemory - initialMemory.usedMemory;

    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB threshold
  });
});
```

This comprehensive performance optimization guide ensures Yeser maintains excellent performance across all devices while providing users with a smooth, responsive experience.
