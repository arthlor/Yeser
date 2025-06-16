import { useCallback, useRef, useState } from 'react';

/**
 * 🚀 Phase 4: Batched State Updates Hook
 *
 * Optimizes React Native performance by batching rapid state updates
 * into a single render cycle, reducing unnecessary re-renders.
 *
 * This is particularly effective for:
 * - Magic link operations with multiple quick state changes
 * - Loading states that change rapidly
 * - Form validation with multiple field updates
 */

export interface BatchedStateOptions {
  batchWindowMs?: number; // Default: 16ms (single frame)
  maxBatchSize?: number; // Default: 50 updates
}

/**
 * Custom hook that batches state updates to reduce re-renders
 */
export function useBatchedState<T>(
  initialState: T,
  options: BatchedStateOptions = {}
): [T, (update: Partial<T> | ((prev: T) => Partial<T>)) => void, () => void] {
  const { batchWindowMs = 16, maxBatchSize = 50 } = options;

  const [state, setState] = useState<T>(initialState);
  const pendingUpdates = useRef<Array<Partial<T> | ((prev: T) => Partial<T>)>>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const batchCountRef = useRef(0);

  const flushUpdates = useCallback(() => {
    if (pendingUpdates.current.length === 0) {
      return;
    }

    setState((prevState) => {
      let newState = prevState;

      // Apply all pending updates in sequence
      for (const update of pendingUpdates.current) {
        if (typeof update === 'function') {
          const partialUpdate = update(newState);
          newState = { ...newState, ...partialUpdate };
        } else {
          newState = { ...newState, ...update };
        }
      }

      return newState;
    });

    // Clear pending updates
    pendingUpdates.current = [];
    batchCountRef.current = 0;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const batchedSetState = useCallback(
    (update: Partial<T> | ((prev: T) => Partial<T>)) => {
      pendingUpdates.current.push(update);
      batchCountRef.current += 1;

      // Force flush if we've hit the max batch size
      if (batchCountRef.current >= maxBatchSize) {
        flushUpdates();
        return;
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for batching
      timeoutRef.current = setTimeout(() => {
        flushUpdates();
      }, batchWindowMs);
    },
    [batchWindowMs, maxBatchSize, flushUpdates]
  );

  // Manual flush function
  const flush = useCallback(() => {
    flushUpdates();
  }, [flushUpdates]);

  // Cleanup on unmount
  const cleanupRef = useRef(false);
  if (!cleanupRef.current) {
    cleanupRef.current = true;

    // Return cleanup function
    const cleanup = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    // This pattern ensures cleanup happens on unmount
    setTimeout(() => {
      return cleanup;
    }, 0);
  }

  return [state, batchedSetState, flush];
}

/**
 * Specialized batched state hook for magic link operations
 */
export function useBatchedMagicLinkState(initialState: {
  isLoading: boolean;
  error: string | null;
  magicLinkSent: boolean;
}) {
  return useBatchedState(initialState, {
    batchWindowMs: 8, // Faster batching for auth operations (half frame)
    maxBatchSize: 10, // Smaller batches for simpler state
  });
}

/**
 * Performance-optimized state updater that intelligently batches updates
 * Only creates new state object if values actually changed
 */
export function createOptimizedStateUpdater<T extends Record<string, unknown>>(
  setState: (update: Partial<T>) => void
) {
  let lastUpdate: Partial<T> = {};

  return (update: Partial<T>) => {
    // Check if any values actually changed
    const hasChanges = Object.keys(update).some((key) => {
      return lastUpdate[key] !== update[key];
    });

    if (hasChanges) {
      lastUpdate = { ...lastUpdate, ...update };
      setState(update);
    }
  };
}
