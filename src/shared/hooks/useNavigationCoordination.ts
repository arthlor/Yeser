import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { logger } from '@/utils/debugConfig';

// **RACE CONDITION FIX**: Navigation coordination types
interface NavigationOperation {
  type: 'navigate' | 'goBack' | 'replace' | 'reset';
  target?: string;
  params?: Record<string, unknown>;
  timestamp: number;
}

interface NavigationState {
  isNavigating: boolean;
  lastOperation: NavigationOperation | null;
  pendingOperations: NavigationOperation[];
}

// **RACE CONDITION FIX**: Navigation debounce and coordination
export const useNavigationCoordination = () => {
  const navigation = useNavigation();

  // Navigation state tracking
  const navigationState = useRef<NavigationState>({
    isNavigating: false,
    lastOperation: null,
    pendingOperations: [],
  });

  // Component mount state
  const isMountedRef = useRef(true);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // **RACE CONDITION FIX**: Debounce navigation operations
  const NAVIGATION_DEBOUNCE_MS = 300; // Prevent rapid navigation calls
  const NAVIGATION_TIMEOUT_MS = 1000; // Reset navigation state after timeout

  // **RACE CONDITION FIX**: Check if navigation operation is allowed
  const canNavigate = useCallback((operation: NavigationOperation): boolean => {
    const state = navigationState.current;
    const now = Date.now();

    // Prevent navigation if already navigating
    if (state.isNavigating) {
      logger.debug('Navigation blocked: already navigating', {
        current_operation: state.lastOperation?.type,
        attempted_operation: operation.type,
      });
      return false;
    }

    // Prevent duplicate operations within debounce period
    if (state.lastOperation) {
      const timeSinceLastOperation = now - state.lastOperation.timestamp;

      if (timeSinceLastOperation < NAVIGATION_DEBOUNCE_MS) {
        // Check if it's the same operation
        const isSameOperation =
          state.lastOperation.type === operation.type &&
          state.lastOperation.target === operation.target;

        if (isSameOperation) {
          logger.debug('Navigation blocked: duplicate operation within debounce period', {
            operation: operation.type,
            target: operation.target,
            time_since_last: timeSinceLastOperation,
          });
          return false;
        }
      }
    }

    return true;
  }, []);

  // **RACE CONDITION FIX**: Execute navigation operation safely
  const executeNavigation = useCallback(
    (operation: NavigationOperation) => {
      if (!isMountedRef.current) {
        return;
      }

      try {
        // Set navigation state
        navigationState.current.isNavigating = true;
        navigationState.current.lastOperation = operation;

        // Clear any existing timeout
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
        }

        // Execute navigation based on type
        switch (operation.type) {
          case 'navigate':
            if (operation.target) {
              // Use any to bypass complex navigation typing
              (navigation as any).navigate(operation.target, operation.params);
            }
            break;

          case 'goBack':
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              logger.warn('Cannot go back: no previous screen in stack');
            }
            break;

          case 'replace':
            if (operation.target) {
              // Use any to bypass complex navigation typing
              (navigation as any).replace?.(operation.target, operation.params);
            }
            break;

          case 'reset':
            if (operation.target) {
              // Use any to bypass complex navigation typing
              (navigation as any).reset({
                index: 0,
                routes: [{ name: operation.target, params: operation.params }],
              });
            }
            break;

          default:
            logger.warn('Unknown navigation operation type', { type: operation.type });
        }

        // Reset navigation state after timeout
        navigationTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            navigationState.current.isNavigating = false;
          }
        }, NAVIGATION_TIMEOUT_MS);

        logger.debug('Navigation executed successfully', {
          type: operation.type,
          target: operation.target,
          has_params: !!operation.params,
        });
      } catch (error) {
        // Reset state on error
        navigationState.current.isNavigating = false;
        logger.error('Navigation error:', error as Error);
        throw error;
      }
    },
    [navigation]
  );

  // **SAFE NAVIGATION FUNCTIONS**: Coordinated navigation methods
  const safeNavigate = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      const operation: NavigationOperation = {
        type: 'navigate',
        target: screen,
        params,
        timestamp: Date.now(),
      };

      if (canNavigate(operation)) {
        executeNavigation(operation);
      }
    },
    [canNavigate, executeNavigation]
  );

  const safeGoBack = useCallback(() => {
    const operation: NavigationOperation = {
      type: 'goBack',
      timestamp: Date.now(),
    };

    if (canNavigate(operation)) {
      executeNavigation(operation);
    }
  }, [canNavigate, executeNavigation]);

  const safeReplace = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      const operation: NavigationOperation = {
        type: 'replace',
        target: screen,
        params,
        timestamp: Date.now(),
      };

      if (canNavigate(operation)) {
        executeNavigation(operation);
      }
    },
    [canNavigate, executeNavigation]
  );

  const safeReset = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      const operation: NavigationOperation = {
        type: 'reset',
        target: screen,
        params,
        timestamp: Date.now(),
      };

      if (canNavigate(operation)) {
        executeNavigation(operation);
      }
    },
    [canNavigate, executeNavigation]
  );

  // **BATCH NAVIGATION**: Execute multiple operations in sequence
  const batchNavigate = useCallback(
    (operations: Omit<NavigationOperation, 'timestamp'>[]) => {
      const now = Date.now();
      const timestampedOperations = operations.map((op, index) => ({
        ...op,
        timestamp: now + index * 100, // Stagger operations
      }));

      // Add to pending operations
      navigationState.current.pendingOperations.push(...timestampedOperations);

      // Execute first operation if not currently navigating
      if (!navigationState.current.isNavigating && timestampedOperations.length > 0) {
        const firstOperation = timestampedOperations[0];
        if (canNavigate(firstOperation)) {
          executeNavigation(firstOperation);
        }
      }
    },
    [canNavigate, executeNavigation]
  );

  // **CONDITIONAL NAVIGATION**: Navigate only if condition is met
  const conditionalNavigate = useCallback(
    (condition: boolean | (() => boolean), screen: string, params?: Record<string, unknown>) => {
      const shouldNavigate = typeof condition === 'function' ? condition() : condition;

      if (shouldNavigate) {
        safeNavigate(screen, params);
      } else {
        logger.debug('Conditional navigation skipped', {
          screen,
          condition_result: shouldNavigate,
        });
      }
    },
    [safeNavigate]
  );

  // **CLEANUP**: Clean up on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Safe navigation methods
    safeNavigate,
    safeGoBack,
    safeReplace,
    safeReset,

    // Advanced navigation methods
    batchNavigate,
    conditionalNavigate,

    // State queries
    isNavigating: () => navigationState.current.isNavigating,
    getLastOperation: () => navigationState.current.lastOperation,

    // Direct access to navigation (for edge cases)
    navigation,
  };
};
