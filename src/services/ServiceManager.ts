// src/services/ServiceManager.ts
// 3-Phase Service Manager for progressive app initialization
// Phase 1: Critical - Immediate UI essentials (synchronous)
// Phase 2: Core - Essential services (parallel async)
// Phase 3: Enhancement - Non-critical services (background)

import { logger } from '@/utils/debugConfig';
import { supabaseService } from '@/utils/supabaseClient';
import { backgroundSyncService } from './backgroundSyncService';
import { networkMonitorService } from './networkMonitorService';
// Phase-based initialization types
export type InitializationPhase = 'critical' | 'core' | 'enhancement' | 'complete';
export type ServiceName =
  | 'asyncStorage'
  | 'supabase'
  | 'backgroundSync'
  | 'networkMonitor'
  | 'revenueCat';
export type ServiceStatus = 'pending' | 'initializing' | 'ready' | 'error' | 'skipped';
import { useSubscriptionStore } from '@/store/subscriptionStore';

// Development mode detection
const IS_DEVELOPMENT = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'development';

// Phase-based state interface
export interface PhaseBasedState {
  phase: InitializationPhase;
  coreReady: boolean;
  enhancementReady: boolean;
  isComplete: boolean;
  error: Error | null;
  serviceStatus: Record<ServiceName, ServiceStatus>;
  startTime: number;
  coreCompleteTime?: number;
  enhancementCompleteTime?: number;
}

class ServiceManager {
  private phaseState: PhaseBasedState = {
    phase: 'critical',
    coreReady: false,
    enhancementReady: false,
    isComplete: false,
    error: null,
    serviceStatus: {
      asyncStorage: 'pending',
      supabase: 'pending',
      backgroundSync: 'pending',
      networkMonitor: 'pending',
      revenueCat: 'pending',
    },
    startTime: Date.now(),
  };

  // Phase-based initialization methods

  /**
   * Phase 1: Critical - Immediate UI essentials (synchronous)
   * Only sets up what's absolutely required for UI rendering
   */
  initializeCritical(): void {
    logger.debug('[COLD START v2] Phase 1: Critical initialization starting...');
    const startTime = Date.now();

    try {
      // Initialize console protection and error monitoring first
      this.initializeConsoleProtection();
      this.initializeGlobalErrorHandling();

      // Phase 1 is purely synchronous setup - no async operations
      // This includes theme providers, error boundaries, navigation setup
      // All handled by React component mounting, so this is essentially a no-op

      this.phaseState.phase = 'core';

      const duration = Date.now() - startTime;
      logger.debug('[COLD START v2] Phase 1: Critical completed', { duration: `${duration}ms` });
    } catch (error) {
      logger.error('[COLD START v2] Phase 1: Critical failed:', error as Error);
      this.phaseState.error = error as Error;
      throw error;
    }
  }

  /**
   * Phase 2: Core - Essential services needed before user interaction
   * Runs services in parallel for maximum speed
   */
  async initializeCore(): Promise<void> {
    logger.debug('[COLD START v2] Phase 2: Core services initialization starting...');
    const startTime = Date.now();

    try {
      // Run all core services in parallel using Promise.allSettled
      const coreServices = [
        this.initializeAsyncStorageCore(),
        this.initializeSupabaseCore(),
        this.initializeRevenueCatCore(),
      ];

      const results = await Promise.allSettled(coreServices);

      // Process results - log errors but don't fail for non-critical services
      let criticalFailure = false;
      results.forEach((result, index) => {
        const serviceName =
          (['asyncStorage', 'supabase', 'revenueCat'] as const)[index] ?? `service_${index}`;
        if (result.status === 'rejected') {
          logger.error(`[COLD START v2] Core service ${serviceName} failed:`, result.reason);
          if (serviceName === 'asyncStorage') {
            criticalFailure = true; // AsyncStorage is critical
          }
        }
      });

      if (criticalFailure && !IS_DEVELOPMENT) {
        throw new Error('Critical core service failed');
      }

      this.phaseState.phase = 'enhancement';
      this.phaseState.coreReady = true;
      this.phaseState.coreCompleteTime = Date.now();

      const duration = Date.now() - startTime;
      logger.debug('[COLD START v2] Phase 2: Core completed successfully', {
        duration: `${duration}ms`,
        services: this.getCoreServicesSummary(),
      });
    } catch (error) {
      logger.error('[COLD START v2] Phase 2: Core failed:', error as Error);
      this.phaseState.error = error as Error;

      if (IS_DEVELOPMENT) {
        logger.warn('[COLD START v2] Phase 2: Continuing in development mode with fallbacks');
        this.phaseState.coreReady = true;
        this.phaseState.phase = 'enhancement';
      } else {
        throw error;
      }
    }
  }

  /**
   * Phase 3: Enhancement - Non-critical services (fire-and-forget)
   * Runs completely in background after UI is visible
   */
  initializeEnhancement(): Promise<void> {
    logger.debug('[COLD START v2] Phase 3: Enhancement services initialization starting...');

    // Fire-and-forget background initialization
    return this.runEnhancementServices()
      .then(() => {
        this.phaseState.phase = 'complete';
        this.phaseState.enhancementReady = true;
        this.phaseState.isComplete = true;
        this.phaseState.enhancementCompleteTime = Date.now();

        const totalDuration = Date.now() - this.phaseState.startTime;
        logger.debug('[COLD START v2] Phase 3: Enhancement completed', {
          totalDuration: `${totalDuration}ms`,
          services: this.getEnhancementServicesSummary(),
        });
      })
      .catch((error) => {
        logger.error('[COLD START v2] Phase 3: Enhancement failed (non-critical):', error as Error);
        // Don't update error state - enhancement failures are non-critical
        this.phaseState.enhancementReady = true;
        this.phaseState.isComplete = true;
      });
  }

  // 🆕 NEW: Console protection and error handling initialization

  private initializeConsoleProtection(): void {
    try {
      // Only protect console in production
      if (!__DEV__) {
        import('@/utils/debugConfig')
          .then(({ protectConsole }) => {
            protectConsole();
            logger.debug('[COLD START v2] Console protection initialized');
          })
          .catch((error) => {
            logger.warn('[COLD START v2] Failed to initialize console protection', {
              error: error instanceof Error ? error.message : String(error),
              component: 'ServiceManager',
            });
          });
      }
    } catch (error) {
      logger.warn('[COLD START v2] Console protection initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        component: 'ServiceManager',
      });
    }
  }

  private initializeGlobalErrorHandling(): void {
    try {
      import('@/utils/errorTranslation')
        .then(({ initializeGlobalErrorMonitoring }) => {
          initializeGlobalErrorMonitoring();
          logger.debug('[COLD START v2] Global error monitoring initialized');
        })
        .catch((error) => {
          logger.warn('[COLD START v2] Failed to initialize global error monitoring', {
            error: error instanceof Error ? error.message : String(error),
            component: 'ServiceManager',
          });
        });
    } catch (error) {
      logger.warn('[COLD START v2] Global error monitoring initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        component: 'ServiceManager',
      });
    }
  }

  // 🆕 NEW: Core service initialization methods (parallel)

  private async initializeAsyncStorageCore(): Promise<void> {
    this.updateServiceStatus('asyncStorage', 'initializing');

    try {
      const testKey = '__service_manager_test__';
      const testValue = Date.now().toString();

      // Use Promise.race for timeout
      const testPromise = (async () => {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem(testKey, testValue);
        const retrieved = await AsyncStorage.default.getItem(testKey);
        if (retrieved !== testValue) {
          throw new Error('AsyncStorage test value mismatch');
        }
        await AsyncStorage.default.removeItem(testKey);
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AsyncStorage timeout')), 2000);
      });

      await Promise.race([testPromise, timeoutPromise]);
      this.updateServiceStatus('asyncStorage', 'ready');
    } catch (error) {
      this.updateServiceStatus('asyncStorage', 'error');
      throw error;
    }
  }

  private async initializeSupabaseCore(): Promise<void> {
    this.updateServiceStatus('supabase', 'initializing');

    try {
      await supabaseService.initializeLazy();
      this.updateServiceStatus('supabase', 'ready');
    } catch (error) {
      this.updateServiceStatus('supabase', 'error');
      if (!IS_DEVELOPMENT) {
        throw error;
      }
      // In development, log error but continue
      logger.warn('[COLD START v2] Supabase initialization failed in development mode');
    }
  }

  private async initializeRevenueCatCore(): Promise<void> {
    // RevenueCat isn't strictly 'critical' for app boot, but we want it early for Paywalls
    // It handles its own internal init state safe-guards
    this.updateServiceStatus('revenueCat', 'initializing');
    try {
      await useSubscriptionStore.getState().initialize();
      // We generally don't block core init on this unless we want to enforce paywall on boot
      // For now, allow it to fail or succeed independently but track it
      this.updateServiceStatus('revenueCat', 'ready');
      logger.debug('[COLD START v2] RevenueCat initialized');
    } catch (error) {
      this.updateServiceStatus('revenueCat', 'error');
      logger.warn('[COLD START v2] RevenueCat init failed', { error: error });
      // Don't throw, let app continue
    }
  }

  // 🆕 NEW: Enhancement service initialization (background)

  private async runEnhancementServices(): Promise<void> {
    const enhancementServices = [
      this.initializeBackgroundSyncEnhancement(),
      this.initializeNetworkMonitoringEnhancement(),
      this.runDatabaseOptimizations(),
    ];

    // Use Promise.allSettled for enhancement services - none are critical
    const results = await Promise.allSettled(enhancementServices);

    results.forEach((result, index) => {
      const serviceName = ['backgroundSync', 'networkMonitor', 'optimization'][index];
      if (result.status === 'rejected') {
        logger.warn(
          `[COLD START v2] Enhancement service ${serviceName} failed (non-critical): ${String(result.reason)}`,
          { error: result.reason }
        );
      }
    });
  }

  private async initializeBackgroundSyncEnhancement(): Promise<void> {
    this.updateServiceStatus('backgroundSync', 'initializing');
    try {
      await backgroundSyncService.initialize();
      this.updateServiceStatus('backgroundSync', 'ready');
    } catch (error) {
      this.updateServiceStatus('backgroundSync', 'error');
      throw error;
    }
  }

  private async initializeNetworkMonitoringEnhancement(): Promise<void> {
    this.updateServiceStatus('networkMonitor', 'initializing');
    try {
      await networkMonitorService.initialize();
      this.updateServiceStatus('networkMonitor', 'ready');
    } catch (error) {
      this.updateServiceStatus('networkMonitor', 'error');
      throw error;
    }
  }

  private async runDatabaseOptimizations(): Promise<void> {
    try {
      // Database sync and optimization
      if (this.phaseState.serviceStatus.backgroundSync === 'ready') {
        await backgroundSyncService.syncPendingMutations();
      }
    } catch (error) {
      logger.warn(`[COLD START v2] Database optimization failed (non-critical): ${String(error)}`);
    }
  }

  // 🆕 NEW: Phase-based state management

  private updateServiceStatus(service: ServiceName, status: ServiceStatus): void {
    this.phaseState.serviceStatus[service] = status;
  }

  private getCoreServicesSummary(): Record<string, string> {
    return {
      asyncStorage: this.phaseState.serviceStatus.asyncStorage,
      supabase: this.phaseState.serviceStatus.supabase,
      revenueCat: this.phaseState.serviceStatus.revenueCat,
    };
  }

  private getEnhancementServicesSummary(): Record<string, string> {
    return {
      backgroundSync: this.phaseState.serviceStatus.backgroundSync,
      networkMonitor: this.phaseState.serviceStatus.networkMonitor,
    };
  }

  // 🆕 NEW: Public phase-based getters

  getPhase(): InitializationPhase {
    return this.phaseState.phase;
  }

  isPhaseComplete(phase: InitializationPhase): boolean {
    switch (phase) {
      case 'critical':
        return this.phaseState.phase !== 'critical';
      case 'core':
        return this.phaseState.coreReady;
      case 'enhancement':
        return this.phaseState.enhancementReady;
      case 'complete':
        return this.phaseState.isComplete;
      default:
        return false;
    }
  }

  getPhaseState(): Readonly<PhaseBasedState> {
    return { ...this.phaseState };
  }

  getServiceStatus(service: ServiceName): ServiceStatus {
    return this.phaseState.serviceStatus[service];
  }

  // Performance metrics
  getPerformanceMetrics() {
    const now = Date.now();
    return {
      totalDuration: now - this.phaseState.startTime,
      corePhaseTime: this.phaseState.coreCompleteTime
        ? this.phaseState.coreCompleteTime - this.phaseState.startTime
        : null,
      enhancementPhaseTime: this.phaseState.enhancementCompleteTime
        ? this.phaseState.enhancementCompleteTime -
          (this.phaseState.coreCompleteTime || this.phaseState.startTime)
        : null,
      isComplete: this.phaseState.isComplete,
    };
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager();
