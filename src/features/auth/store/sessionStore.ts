import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/utils/debugConfig';
import { atomicOperationManager } from '../utils/atomicOperations';
import { useCoreAuthStore } from './coreAuthStore';

/**
 * Session State Interface
 * Handles session persistence and management
 */
export interface SessionState {
  // Session State
  hasPersistedSession: boolean;
  sessionRestored: boolean;
  lastSessionCheck: number | null;

  // Session Actions
  markSessionRestored: () => void;
  clearPersistedSession: () => void;
  updateSessionCheck: () => void;

  // Session Utilities
  shouldCheckSession: () => boolean;
  getSessionAge: () => number;
}

/**
 * Session Store
 *
 * Handles session persistence and management including:
 * - Session restoration on app startup
 * - Session persistence across app restarts
 * - Session validation and expiry checking
 * - Session cleanup on logout
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial State
      hasPersistedSession: false,
      sessionRestored: false,
      lastSessionCheck: null,

      // Session Actions
      markSessionRestored: () => {
        set({
          sessionRestored: true,
          hasPersistedSession: true,
          lastSessionCheck: Date.now(),
        });
        logger.debug('Session store: Session marked as restored');
      },

      clearPersistedSession: () => {
        set({
          hasPersistedSession: false,
          sessionRestored: false,
          lastSessionCheck: null,
        });
        logger.debug('Session store: Persisted session cleared');
      },

      updateSessionCheck: () => {
        set({ lastSessionCheck: Date.now() });
      },

      // Session Utilities
      shouldCheckSession: () => {
        const { lastSessionCheck } = get();
        if (!lastSessionCheck) {
          return true;
        }

        // Check session every 5 minutes
        const checkInterval = 5 * 60 * 1000; // 5 minutes
        return Date.now() - lastSessionCheck > checkInterval;
      },

      getSessionAge: () => {
        const { lastSessionCheck } = get();
        if (!lastSessionCheck) {
          return 0;
        }
        return Date.now() - lastSessionCheck;
      },
    }),
    {
      name: 'yeser-session-store',
      storage: {
        getItem: async (name: string) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            logger.error('Session store: Failed to get item from AsyncStorage:', error as Error);
            return null;
          }
        },
        setItem: async (name: string, value: unknown) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            logger.error('Session store: Failed to set item in AsyncStorage:', error as Error);
          }
        },
        removeItem: async (name: string) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch (error) {
            logger.error('Session store: Failed to remove item from AsyncStorage:', error as Error);
          }
        },
      },
      partialize: (state) => ({
        hasPersistedSession: state.hasPersistedSession,
        sessionRestored: false, // Always start as false on app restart
        lastSessionCheck: state.lastSessionCheck,
      }),
    }
  )
);

/**
 * Session Management Utilities
 */
export const sessionUtils = {
  /**
   * Initialize session restoration process
   */
  initializeSessionRestore: async (): Promise<void> => {
    const operationKey = 'session_restore';

    try {
      await atomicOperationManager.ensureAtomicOperation(operationKey, 'auth_init', async () => {
        const sessionStore = useSessionStore.getState();
        const coreAuthStore = useCoreAuthStore.getState();

        logger.debug('Session utils: Starting session restoration');

        // Check if we have a persisted session
        if (sessionStore.hasPersistedSession && !sessionStore.sessionRestored) {
          // Initialize core auth which will check for existing session
          await coreAuthStore.initializeAuth();

          // Mark session as restored
          sessionStore.markSessionRestored();

          logger.debug('Session utils: Session restoration completed');
        } else {
          logger.debug('Session utils: No persisted session to restore');
        }
      });
    } catch (error) {
      logger.debug('Session utils: Session restoration already in progress', {
        error: (error as Error).message,
      });
    }
  },

  /**
   * Clear all session data
   */
  clearAllSessionData: async (): Promise<void> => {
    const operationKey = 'session_clear';

    try {
      await atomicOperationManager.ensureAtomicOperation(operationKey, 'logout', async () => {
        const sessionStore = useSessionStore.getState();

        logger.debug('Session utils: Clearing all session data');

        // Clear persisted session
        sessionStore.clearPersistedSession();

        logger.debug('Session utils: All session data cleared');
      });
    } catch (error) {
      logger.debug('Session utils: Session clear already in progress', {
        error: (error as Error).message,
      });
    }
  },

  /**
   * Validate current session
   */
  validateSession: async (): Promise<boolean> => {
    const sessionStore = useSessionStore.getState();
    const coreAuthStore = useCoreAuthStore.getState();

    // Update session check timestamp
    sessionStore.updateSessionCheck();

    // Check if user is authenticated
    if (!coreAuthStore.isAuthenticated || !coreAuthStore.user) {
      logger.debug('Session utils: Session validation failed - no authenticated user');
      return false;
    }

    logger.debug('Session utils: Session validation passed');
    return true;
  },
};

// Export default for backward compatibility
export default useSessionStore;
