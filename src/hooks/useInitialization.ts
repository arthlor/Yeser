import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { serviceManager } from '@/services/ServiceManager';
import type { InitializationPhase } from '@/services/ServiceManager';
import { logger } from '@/utils/debugConfig';

interface InitializationState {
  phase: InitializationPhase;
  coreReady: boolean;
  enhancementReady: boolean;
  isComplete: boolean;
  error: Error | null;
  performanceMetrics: {
    totalDuration: number;
    corePhaseTime: number | null;
    enhancementPhaseTime: number | null;
  };
}

// 🛡️ SAFETY TIMEOUT: Maximum time before forcing splash screen to hide
const SPLASH_TIMEOUT_MS = 5000; // 5 seconds maximum (reduced from 10s)

/**
 * Hook to manage the 3-phase cold start initialization process
 *
 * Phase 1 - Critical (0ms): Immediate UI essentials (synchronous)
 * Phase 2 - Core (~100-300ms): Essential services, splash hides after this
 * Phase 3 - Enhancement (background): Non-critical services
 */
export const useInitialization = () => {
  const [initState, setInitState] = useState<InitializationState>({
    phase: 'critical',
    coreReady: false,
    enhancementReady: false,
    isComplete: false,
    error: null,
    performanceMetrics: {
      totalDuration: 0,
      corePhaseTime: null,
      enhancementPhaseTime: null,
    },
  });

  useEffect(() => {
    let isMounted = true;
    let splashTimeoutId: ReturnType<typeof setTimeout>;

    const forceSplashHide = async () => {
      try {
        logger.warn('[COLD START v2] SAFETY TIMEOUT: Forcing splash screen to hide after 5s');
        await SplashScreen.hideAsync();
      } catch (error) {
        logger.error('[COLD START v2] Failed to force hide splash screen:', error as Error);
      }
    };

    const initialize = async () => {
      try {
        logger.debug('[COLD START v2] Starting 3-phase initialization...');

        // 🛡️ SAFETY TIMEOUT: Force splash hide after maximum time
        splashTimeoutId = setTimeout(forceSplashHide, SPLASH_TIMEOUT_MS);

        // Phase 1: Critical (immediate, synchronous)
        serviceManager.initializeCritical();

        if (isMounted) {
          setInitState((prev) => ({
            ...prev,
            phase: 'core',
          }));
        }

        // Phase 2: Core (parallel async services)
        await serviceManager.initializeCore();

        if (isMounted) {
          const metrics = serviceManager.getPerformanceMetrics();

          setInitState((prev) => ({
            ...prev,
            phase: 'enhancement',
            coreReady: true,
            performanceMetrics: metrics,
          }));

          // 🚀 CRITICAL: Hide splash immediately after core services complete
          try {
            logger.debug('[COLD START v2] Core phase complete - hiding splash screen');
            await SplashScreen.hideAsync();
            clearTimeout(splashTimeoutId);
            logger.debug('[COLD START v2] Splash screen hidden successfully');
          } catch (splashError) {
            logger.error('[COLD START v2] Failed to hide splash screen:', splashError as Error);
            // Don't throw - app should continue
          }
        }

        // Phase 3: Enhancement (fire-and-forget background)
        serviceManager.initializeEnhancement().then(() => {
          if (isMounted) {
            const finalMetrics = serviceManager.getPerformanceMetrics();
            setInitState((prev) => ({
              ...prev,
              phase: 'complete',
              enhancementReady: true,
              isComplete: true,
              performanceMetrics: finalMetrics,
            }));

            logger.debug('[COLD START v2] All phases complete - app fully initialized', {
              totalTime: `${finalMetrics.totalDuration}ms`,
              coreTime: finalMetrics.corePhaseTime ? `${finalMetrics.corePhaseTime}ms` : 'N/A',
              enhancementTime: finalMetrics.enhancementPhaseTime
                ? `${finalMetrics.enhancementPhaseTime}ms`
                : 'N/A',
            });
          }
        });
      } catch (error) {
        logger.error('[COLD START v2] Critical initialization failure:', error as Error);

        if (isMounted) {
          setInitState((prev) => ({
            ...prev,
            error: error as Error,
          }));

          // 🛡️ CRITICAL: Always hide splash to show error screen
          try {
            await SplashScreen.hideAsync();
            clearTimeout(splashTimeoutId);
          } catch (splashError) {
            logger.error('[COLD START v2] Failed to hide splash on error:', splashError as Error);
          }
        }
      }
    };

    // Keep splash screen visible during initialization
    SplashScreen.preventAutoHideAsync().catch((error) => {
      logger.warn('[COLD START v2] Could not prevent splash screen auto-hide:', {
        error: error.message,
      });
    });

    // Start initialization
    initialize();

    // Cleanup function
    return () => {
      isMounted = false;
      if (splashTimeoutId) {
        clearTimeout(splashTimeoutId);
      }
    };
  }, []);

  return {
    ...initState,
    // Additional derived state for convenience
    isPhaseComplete: (phase: InitializationPhase) => serviceManager.isPhaseComplete(phase),
    serviceStatus: serviceManager.getPhaseState().serviceStatus,
    currentPhase: serviceManager.getPhase(),

    // Legacy compatibility helpers
    isStageComplete: (stage: number) => {
      // Map old stages to new phases for backward compatibility
      switch (stage) {
        case 1:
          return initState.phase !== 'critical';
        case 2:
          return initState.coreReady;
        case 3:
        case 4:
          return initState.enhancementReady;
        default:
          return false;
      }
    },

    // Performance insights
    getTimeToInteractive: () => initState.performanceMetrics.corePhaseTime,
    getTotalInitTime: () => initState.performanceMetrics.totalDuration,
  };
};
