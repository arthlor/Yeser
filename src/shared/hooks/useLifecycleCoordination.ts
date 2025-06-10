import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { logger } from '@/utils/debugConfig';

// **RACE CONDITION FIX**: Lifecycle coordination types
interface LifecycleState {
  isMounted: boolean;
  isFocused: boolean;
  isVisible: boolean;
  appState: AppStateStatus;
  lastFocusTime: number;
  lastBlurTime: number;
}

interface AsyncOperation {
  id: string;
  type: 'fetch' | 'mutation' | 'animation' | 'timer' | 'other';
  promise: Promise<unknown>;
  cleanup?: () => void;
  timestamp: number;
}

// **RACE CONDITION FIX**: Component lifecycle coordination
export const useLifecycleCoordination = () => {
  // Lifecycle state tracking
  const [lifecycleState, setLifecycleState] = useState<LifecycleState>({
    isMounted: false,
    isFocused: false,
    isVisible: false,
    appState: AppState.currentState,
    lastFocusTime: 0,
    lastBlurTime: 0,
  });

  // Async operations tracking
  const activeOperations = useRef<Map<string, AsyncOperation>>(new Map());
  const operationCounter = useRef(0);

  // **RACE CONDITION FIX**: Safe state updates only when mounted
  const safeSetState = useCallback((updates: Partial<LifecycleState>) => {
    setLifecycleState((prev) => {
      // Only update if component is still mounted
      if (!prev.isMounted) {
        return prev;
      }
      return { ...prev, ...updates };
    });
  }, []);

  // **OPERATION CONTROL**: Pause active operations
  const pauseActiveOperations = useCallback(() => {
    const operations = activeOperations.current;
    logger.debug('Pausing active operations', { count: operations.size });

    operations.forEach((operation) => {
      if (operation.cleanup) {
        try {
          operation.cleanup();
        } catch (error) {
          logger.error('Error pausing operation:', error as Error);
        }
      }
    });
  }, []);

  // **OPERATION CONTROL**: Resume active operations
  const resumeActiveOperations = useCallback(() => {
    const operations = activeOperations.current;
    logger.debug('Resuming active operations', { count: operations.size });

    // Note: This is a placeholder - actual resume logic would depend on operation type
    // Most operations would need to be restarted rather than resumed
  }, []);

  // **MOUNT/UNMOUNT COORDINATION**: Track component mount state
  useEffect(() => {
    setLifecycleState((prev) => ({
      ...prev,
      isMounted: true,
      isVisible: true,
    }));

    // Capture the ref value for cleanup
    const operationsRef = activeOperations.current;

    return () => {
      // Cleanup all active operations on unmount
      operationsRef.forEach((operation) => {
        if (operation.cleanup) {
          try {
            operation.cleanup();
          } catch (error) {
            logger.error('Error during operation cleanup:', error as Error);
          }
        }
      });
      operationsRef.clear();

      setLifecycleState((prev) => ({
        ...prev,
        isMounted: false,
        isVisible: false,
      }));
    };
  }, []);

  // **FOCUS/BLUR COORDINATION**: Track screen focus state
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      safeSetState({
        isFocused: true,
        isVisible: true,
        lastFocusTime: now,
      });

      logger.debug('Screen focused', { timestamp: now });

      return () => {
        const blurTime = Date.now();
        safeSetState({
          isFocused: false,
          lastBlurTime: blurTime,
        });

        logger.debug('Screen blurred', { timestamp: blurTime });
      };
    }, [safeSetState])
  );

  // **APP STATE COORDINATION**: Track app foreground/background state
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      safeSetState({
        appState: nextAppState,
        isVisible: nextAppState === 'active',
      });

      logger.debug('App state changed', {
        previous: lifecycleState.appState,
        current: nextAppState,
      });

      // Pause/resume operations based on app state
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        pauseActiveOperations();
      } else if (nextAppState === 'active') {
        resumeActiveOperations();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [lifecycleState.appState, safeSetState, pauseActiveOperations, resumeActiveOperations]);

  // **ASYNC OPERATION MANAGEMENT**: Register and track async operations
  const registerAsyncOperation = useCallback(
    <T>(
      promise: Promise<T>,
      type: AsyncOperation['type'] = 'other',
      cleanup?: () => void
    ): Promise<T> => {
      if (!lifecycleState.isMounted) {
        return Promise.reject(new Error('Component not mounted'));
      }

      const operationId = `${type}_${++operationCounter.current}`;
      const operation: AsyncOperation = {
        id: operationId,
        type,
        promise: promise as Promise<unknown>,
        cleanup,
        timestamp: Date.now(),
      };

      activeOperations.current.set(operationId, operation);

      // Wrap promise to handle cleanup
      const wrappedPromise = promise
        .then((result) => {
          // Remove from active operations on success
          activeOperations.current.delete(operationId);
          return result;
        })
        .catch((error) => {
          // Remove from active operations on error
          activeOperations.current.delete(operationId);

          // Only log error if component is still mounted
          if (lifecycleState.isMounted) {
            logger.error('Async operation failed:', error);
          }

          throw error;
        });

      logger.debug('Async operation registered', {
        id: operationId,
        type,
        total_active: activeOperations.current.size,
      });

      return wrappedPromise;
    },
    [lifecycleState.isMounted]
  );

  // **SAFE ASYNC EXECUTION**: Execute async operation only if component is ready
  const safeAsyncExecution = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      type: AsyncOperation['type'] = 'other'
    ): Promise<T | null> => {
      // Check if component is in a valid state for async operations
      if (!lifecycleState.isMounted || !lifecycleState.isVisible) {
        logger.debug('Async execution skipped - component not ready', {
          isMounted: lifecycleState.isMounted,
          isVisible: lifecycleState.isVisible,
          isFocused: lifecycleState.isFocused,
        });
        return null;
      }

      try {
        const promise = asyncFn();
        return await registerAsyncOperation(promise, type);
      } catch (error) {
        logger.error('Safe async execution failed:', error as Error);
        return null;
      }
    },
    [lifecycleState, registerAsyncOperation]
  );

  // **CONDITIONAL EXECUTION**: Execute function only if conditions are met
  const conditionalExecution = useCallback(
    <T>(
      fn: () => T,
      conditions: {
        requiresMounted?: boolean;
        requiresFocused?: boolean;
        requiresVisible?: boolean;
        requiresActive?: boolean;
      } = {}
    ): T | null => {
      const {
        requiresMounted = true,
        requiresFocused = false,
        requiresVisible = false,
        requiresActive = false,
      } = conditions;

      // Check all conditions
      if (requiresMounted && !lifecycleState.isMounted) {
        return null;
      }
      if (requiresFocused && !lifecycleState.isFocused) {
        return null;
      }
      if (requiresVisible && !lifecycleState.isVisible) {
        return null;
      }
      if (requiresActive && lifecycleState.appState !== 'active') {
        return null;
      }

      try {
        return fn();
      } catch (error) {
        logger.error('Conditional execution failed:', error as Error);
        return null;
      }
    },
    [lifecycleState]
  );

  // **DEBOUNCED EXECUTION**: Execute function with debouncing based on focus/blur
  const debouncedExecution = useCallback(
    <T>(fn: () => T, delay: number = 300): Promise<T | null> => {
      return new Promise((resolve) => {
        const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
          const result = conditionalExecution(fn);
          resolve(result);
        }, delay);

        // Register cleanup for the timeout
        registerAsyncOperation(Promise.resolve(), 'timer', () => clearTimeout(timeoutId));
      });
    },
    [conditionalExecution, registerAsyncOperation]
  );

  return {
    // Lifecycle state
    ...lifecycleState,

    // Async operation management
    registerAsyncOperation,
    safeAsyncExecution,

    // Conditional execution
    conditionalExecution,
    debouncedExecution,

    // Operation control
    pauseActiveOperations,
    resumeActiveOperations,

    // State queries
    isReady: () => lifecycleState.isMounted && lifecycleState.isVisible,
    isActive: () => lifecycleState.appState === 'active',
    getActiveOperationsCount: () => activeOperations.current.size,

    // Timing utilities
    getTimeSinceFocus: () =>
      lifecycleState.lastFocusTime ? Date.now() - lifecycleState.lastFocusTime : 0,
    getTimeSinceBlur: () =>
      lifecycleState.lastBlurTime ? Date.now() - lifecycleState.lastBlurTime : 0,
  };
};
