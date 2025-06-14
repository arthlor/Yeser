import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { serviceManager } from '@/services/ServiceManager';
import type { InitializationStage } from '@/services/ServiceManager';
import { logger } from '@/utils/debugConfig';

interface InitializationState {
  stage: InitializationStage;
  isComplete: boolean;
  isError: boolean;
  error: Error | null;
  progress: number;
  databaseReady: boolean;
  asyncStorageReady: boolean;
}

/**
 * Hook to manage the 4-stage cold start initialization process
 *
 * Stage 1 (0ms): UI ready - Basic providers only
 * Stage 2 (500ms): Core services + database - Splash screen hides after this
 * Stage 3 (2000ms): Background services + database sync
 * Stage 4 (5000ms): Enhancements + database optimization
 */
export const useInitialization = () => {
  const [initState, setInitState] = useState<InitializationState>({
    stage: 1,
    isComplete: false,
    isError: false,
    error: null,
    progress: 0,
    databaseReady: false,
    asyncStorageReady: false,
  });

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        logger.debug('[COLD START] Starting 4-stage initialization...');

        // Stage 1: Immediate UI (0ms) - Already complete when hook runs
        if (isMounted) {
          setInitState((prev) => ({
            ...prev,
            stage: 1,
            progress: 25,
          }));
        }

        // Stage 2: Core Services + Database Connection (500ms)
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!isMounted) {
          return;
        }

        logger.debug('[COLD START] Initializing Stage 2: Core services + database...');
        await serviceManager.initializeStage2();

        if (isMounted) {
          const managerState = serviceManager.getState();
          setInitState((prev) => ({
            ...prev,
            stage: 2,
            progress: 50,
            databaseReady: managerState.databaseConnected,
            asyncStorageReady: managerState.asyncStorageReady,
          }));

          // Hide splash screen after Stage 2 - database is ready
          logger.debug('[COLD START] Stage 2 complete - hiding splash screen');
          await SplashScreen.hideAsync();
        }

        // Stage 3: Background Services + Database Sync (2000ms)
        await new Promise((resolve) => setTimeout(resolve, 1500)); // 2000ms - 500ms already elapsed

        if (!isMounted) {
          return;
        }

        logger.debug('[COLD START] Initializing Stage 3: Background services + database sync...');
        await serviceManager.initializeStage3();

        if (isMounted) {
          const managerState = serviceManager.getState();
          setInitState((prev) => ({
            ...prev,
            stage: 3,
            progress: 75,
            databaseReady: managerState.databaseConnected,
            asyncStorageReady: managerState.asyncStorageReady,
          }));
        }

        // Stage 4: Enhancements + Database Optimization (5000ms)
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 5000ms - 2000ms already elapsed

        if (!isMounted) {
          return;
        }

        logger.debug('[COLD START] Initializing Stage 4: Enhancements + database optimization...');
        await serviceManager.initializeStage4();

        if (isMounted) {
          const managerState = serviceManager.getState();
          setInitState((prev) => ({
            ...prev,
            stage: 4,
            progress: 100,
            isComplete: true,
            databaseReady: managerState.databaseConnected,
            asyncStorageReady: managerState.asyncStorageReady,
          }));

          logger.debug('[COLD START] All stages complete - app fully initialized');
        }
      } catch (error) {
        logger.error('[COLD START] Initialization failed:', error as Error);

        if (isMounted) {
          setInitState((prev) => ({
            ...prev,
            isError: true,
            error: error as Error,
          }));

          // Still hide splash to show error screen
          await SplashScreen.hideAsync();
        }
      }
    };

    // Keep splash screen visible during initialization
    SplashScreen.preventAutoHideAsync().catch((error) => {
      logger.warn('[COLD START] Could not prevent splash screen auto-hide:', error);
    });

    // Start initialization
    initialize();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    ...initState,
    // Additional derived state for convenience
    isStageComplete: (stage: InitializationStage) => initState.stage >= stage,
    summary: serviceManager.getSummary(),
  };
};
