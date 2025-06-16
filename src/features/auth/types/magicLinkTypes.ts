/**
 * Magic Link Types and Interfaces
 *
 * Enhanced type definitions for optimized magic link operations
 * with backward compatibility support.
 */

export interface MagicLinkState {
  isLoading: boolean;
  magicLinkSent: boolean;
  error?: string | null;
}

/**
 * Modern unified callback interface for magic link operations
 * Reduces callback overhead by consolidating state updates
 */
export interface MagicLinkCallbacks {
  onSuccess: (message: string) => void;
  onError: (error: Error) => void;
  onStateChange: (state: MagicLinkState) => void;
}

/**
 * Legacy callback interface for backward compatibility
 * Maintains the original 4-callback pattern
 */
export interface LegacyMagicLinkCallbacks {
  onSuccess: (message: string) => void;
  onError: (error: Error) => void;
  setLoading: (loading: boolean) => void;
  setMagicLinkSent: (sent: boolean) => void;
}

/**
 * Performance metrics for magic link operations
 */
export interface MagicLinkPerformanceMetrics {
  totalTime: number;
  atomicTime: number;
  apiTime: number;
  callbackTime: number;
  stateUpdateTime: number;
}

/**
 * Magic link operation result
 */
export interface MagicLinkResult {
  success: boolean;
  message?: string;
  error?: Error;
  metrics?: MagicLinkPerformanceMetrics;
}

/**
 * Type guard to check if callbacks are modern or legacy
 */
export const isLegacyCallbacks = (
  callbacks: MagicLinkCallbacks | LegacyMagicLinkCallbacks
): callbacks is LegacyMagicLinkCallbacks => {
  return 'setLoading' in callbacks && 'setMagicLinkSent' in callbacks;
};

/**
 * Convert legacy callbacks to modern unified interface
 */
export const convertToModernCallbacks = (
  callbacks: LegacyMagicLinkCallbacks
): MagicLinkCallbacks => {
  return {
    onSuccess: callbacks.onSuccess,
    onError: callbacks.onError,
    onStateChange: (state: MagicLinkState) => {
      callbacks.setLoading(state.isLoading);
      callbacks.setMagicLinkSent(state.magicLinkSent);
    },
  };
};

/**
 * Adapter to convert modern callbacks to legacy format
 */
export const convertToLegacyCallbacks = (
  callbacks: MagicLinkCallbacks
): LegacyMagicLinkCallbacks => {
  let currentState: MagicLinkState = {
    isLoading: false,
    magicLinkSent: false,
    error: null,
  };

  return {
    onSuccess: callbacks.onSuccess,
    onError: callbacks.onError,
    setLoading: (loading: boolean) => {
      currentState = { ...currentState, isLoading: loading };
      callbacks.onStateChange(currentState);
    },
    setMagicLinkSent: (sent: boolean) => {
      currentState = { ...currentState, magicLinkSent: sent, isLoading: false };
      callbacks.onStateChange(currentState);
    },
  };
};
