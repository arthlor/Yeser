// src/services/ServiceManager.ts
// 🚨 COLD START FIX: 4-Stage Service Manager
// This implements the staged initialization system to prevent AsyncStorage deadlocks

import { logger } from '@/utils/debugConfig';
import { supabaseService } from '@/utils/supabaseClient';
import { backgroundSyncService } from './backgroundSyncService';
import { networkMonitorService } from './networkMonitorService';

export type InitializationStage = 1 | 2 | 3 | 4;

// 🆕 NEW: Phase-based initialization (faster, simpler)
export type InitializationPhase = 'critical' | 'core' | 'enhancement' | 'complete';
export type ServiceName = 'asyncStorage' | 'supabase' | 'backgroundSync' | 'networkMonitor';
export type ServiceStatus = 'pending' | 'initializing' | 'ready' | 'error' | 'skipped';

// 🛡️ DEVELOPMENT MODE: Detect development environment
const IS_DEVELOPMENT = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'development';

export interface InitializationState {
  stage1Complete: boolean; // UI ready
  stage2Complete: boolean; // Core services + database connection
  stage3Complete: boolean; // Background services + database sync
  stage4Complete: boolean; // Enhancements + database optimization
  isFullyInitialized: boolean;

  // Database-specific state
  databaseConnected: boolean;
  databaseSyncComplete: boolean;
  asyncStorageReady: boolean;

  // Service states with database dependencies
  services: {
    supabase: ServiceState;
    backgroundSync: ServiceState;
    networkMonitor: ServiceState;
  };

  errors: Record<string, Error>;
  currentStage: InitializationStage;
}

// 🆕 NEW: Simplified phase-based state
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

interface ServiceState {
  status: 'pending' | 'initializing' | 'ready' | 'error' | 'skipped';
  startTime?: number;
  endTime?: number;
  error?: Error;
}

class ServiceManager {
  private state: InitializationState = {
    stage1Complete: false,
    stage2Complete: false,
    stage3Complete: false,
    stage4Complete: false,
    isFullyInitialized: false,
    databaseConnected: false,
    databaseSyncComplete: false,
    asyncStorageReady: false,
    services: {
      supabase: { status: 'pending' },
      backgroundSync: { status: 'pending' },
      networkMonitor: { status: 'pending' },
    },
    errors: {},
    currentStage: 1,
  };

  // 🆕 NEW: Phase-based state
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
    },
    startTime: Date.now(),
  };

  private stageTimeouts: Record<InitializationStage, number> = {
    1: 0, // Immediate UI
    2: 500, // Core services after 500ms
    3: 2000, // Background services after 2s
    4: 5000, // Enhancements after 5s
  };

  // 🆕 NEW: Phase-based initialization methods

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
      const coreServices = [this.initializeAsyncStorageCore(), this.initializeSupabaseCore()];

      const results = await Promise.allSettled(coreServices);

      // Process results - log errors but don't fail for non-critical services
      let criticalFailure = false;
      results.forEach((result, index) => {
        const serviceName = ['asyncStorage', 'supabase'][index];
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
          `[COLD START v2] Enhancement service ${serviceName} failed (non-critical): ${String(result.reason)}`
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

  // 🔄 LEGACY: Keep existing methods for backward compatibility (deprecated)

  /**
   * Get current initialization state
   */
  getState(): Readonly<InitializationState> {
    return { ...this.state };
  }

  /**
   * Check if specific stage is complete
   */
  isStageComplete(stage: InitializationStage): boolean {
    switch (stage) {
      case 1:
        return this.state.stage1Complete;
      case 2:
        return this.state.stage2Complete;
      case 3:
        return this.state.stage3Complete;
      case 4:
        return this.state.stage4Complete;
      default:
        return false;
    }
  }

  /**
   * Stage 1: Immediate UI (0ms)
   * Goal: Get UI responsive instantly
   */
  async initializeStage1(): Promise<void> {
    logger.debug('[COLD START] Stage 1: Immediate UI initialization starting...');
    const startTime = Date.now();

    try {
      // Stage 1 only sets up providers - no AsyncStorage or database operations
      this.state.stage1Complete = true;
      this.state.currentStage = 2;

      const duration = Date.now() - startTime;
      logger.debug('[COLD START] Stage 1 completed successfully', {
        duration: `${duration}ms`,
        nextStage: 2,
      });
    } catch (error) {
      logger.error('[COLD START] Stage 1 failed:', error as Error);
      this.state.errors.stage1 = error as Error;
      throw error;
    }
  }

  /**
   * Stage 2: Core Services + Database Connection (500ms)
   * Goal: Essential app functionality with database ready
   */
  async initializeStage2(): Promise<void> {
    logger.debug('[COLD START] Stage 2: Core services + database connection starting...');
    const startTime = Date.now();

    try {
      // 1. Test AsyncStorage readiness
      await this.ensureAsyncStorageReady();

      // 2. Initialize Supabase client (lazy)
      await this.initializeSupabaseClient();

      this.state.stage2Complete = true;
      this.state.databaseConnected = true;
      this.state.currentStage = 3;

      const duration = Date.now() - startTime;
      logger.debug('[COLD START] Stage 2 completed successfully', {
        duration: `${duration}ms`,
        nextStage: 3,
        databaseConnected: true,
      });
    } catch (error) {
      logger.error('[COLD START] Stage 2 failed:', error as Error);
      this.state.errors.stage2 = error as Error;

      // 🛡️ DEVELOPMENT MODE: Continue with fallback in development
      if (IS_DEVELOPMENT) {
        logger.warn(
          '[COLD START] Stage 2 failed but continuing in development mode with fallbacks'
        );
        this.state.stage2Complete = true;
        this.state.databaseConnected = false; // Mark as not connected
        this.state.currentStage = 3;
      } else {
        throw error;
      }
    }
  }

  /**
   * Stage 3: Background Services + Database Sync (2000ms)
   * Goal: Non-critical features with database sync
   */
  async initializeStage3(): Promise<void> {
    if (!this.state.databaseConnected && !IS_DEVELOPMENT) {
      throw new Error('Database connection required for Stage 3');
    }

    logger.debug('[COLD START] Stage 3: Background services + database sync starting...');
    const startTime = Date.now();

    try {
      // 1. Initialize background sync with database operations
      await this.initializeBackgroundSync();

      // 2. Initialize network monitoring
      await this.initializeNetworkMonitoring();

      // 4. Restore database sync state (skip if no database connection)
      if (this.state.databaseConnected) {
        await this.restoreDatabaseSyncState();
      } else {
        logger.warn('[COLD START] Skipping database sync - no connection available');
      }

      this.state.stage3Complete = true;
      this.state.databaseSyncComplete = this.state.databaseConnected;
      this.state.currentStage = 4;

      const duration = Date.now() - startTime;
      logger.debug('[COLD START] Stage 3 completed successfully', {
        duration: `${duration}ms`,
        nextStage: 4,
        databaseSyncComplete: this.state.databaseSyncComplete,
      });
    } catch (error) {
      logger.error('[COLD START] Stage 3 failed:', error as Error);
      this.state.errors.stage3 = error as Error;

      // 🛡️ GRACEFUL DEGRADATION: Don't throw - app should continue with limited features
      this.state.stage3Complete = true;
      this.state.currentStage = 4;
      logger.warn(
        '[COLD START] Stage 3 completed with errors - app will continue with limited features'
      );
    }
  }

  /**
   * Stage 4: Enhancement Services + Database Optimization (5000ms)
   * Goal: Optimizations and extras
   */
  async initializeStage4(): Promise<void> {
    logger.debug('[COLD START] Stage 4: Enhancement services + database optimization starting...');
    const startTime = Date.now();

    try {
      // 1. Optimize database connections
      await this.optimizeDatabaseConnections();

      // 2. Start performance monitoring
      await this.startPerformanceMonitoring();

      this.state.stage4Complete = true;
      this.state.isFullyInitialized = true;

      const duration = Date.now() - startTime;
      logger.debug('[COLD START] Stage 4 completed successfully', {
        duration: `${duration}ms`,
        fullyInitialized: true,
      });
    } catch (error) {
      logger.error('[COLD START] Stage 4 failed (non-critical):', error as Error);
      this.state.errors.stage4 = error as Error;
      // Don't throw - these are enhancement features
      this.state.stage4Complete = true;
      this.state.isFullyInitialized = true;
    }
  }

  /**
   * Test AsyncStorage readiness with timeout
   */
  private async ensureAsyncStorageReady(): Promise<void> {
    const serviceName = 'asyncStorage';
    this.updateServiceState(serviceName, 'initializing');

    try {
      const testKey = '__service_manager_async_storage_test__';
      const testValue = Date.now().toString();

      const asyncStorageTest = async (): Promise<void> => {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem(testKey, testValue);
        const retrieved = await AsyncStorage.default.getItem(testKey);
        if (retrieved !== testValue) {
          throw new Error('AsyncStorage test value mismatch');
        }
        await AsyncStorage.default.removeItem(testKey);
      };

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('AsyncStorage readiness test timeout after 3 seconds'));
        }, 3000);
      });

      await Promise.race([asyncStorageTest(), timeoutPromise]);

      this.state.asyncStorageReady = true;
      this.updateServiceState(serviceName, 'ready');
      logger.debug('[COLD START] AsyncStorage readiness confirmed');
    } catch (error) {
      this.updateServiceState(serviceName, 'error', error as Error);
      throw error;
    }
  }

  /**
   * Initialize Supabase client with lazy loading
   */
  private async initializeSupabaseClient(): Promise<void> {
    this.updateServiceState('supabase', 'initializing');

    try {
      if (!this.state.asyncStorageReady) {
        throw new Error('AsyncStorage must be ready before Supabase initialization');
      }

      // Initialize with enhanced error protection
      await supabaseService.initializeLazy();

      this.updateServiceState('supabase', 'ready');
      logger.debug('[COLD START] Supabase client initialized successfully');
    } catch (error) {
      this.updateServiceState('supabase', 'error', error as Error);
      throw error;
    }
  }

  /**
   * Initialize background sync with database coordination
   */
  private async initializeBackgroundSync(): Promise<void> {
    this.updateServiceState('backgroundSync', 'initializing');

    try {
      await backgroundSyncService.initialize();

      this.updateServiceState('backgroundSync', 'ready');
      logger.debug('[COLD START] Background sync service initialized successfully');
    } catch (error) {
      this.updateServiceState('backgroundSync', 'error', error as Error);
      logger.error(
        '[COLD START] Background sync initialization failed (non-critical):',
        error as Error
      );
      // Don't throw - background sync is not critical for core functionality
    }
  }

  /**
   * Initialize network monitoring
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    this.updateServiceState('networkMonitor', 'initializing');

    try {
      await networkMonitorService.initialize();

      this.updateServiceState('networkMonitor', 'ready');
      logger.debug('[COLD START] Network monitoring initialized successfully');
    } catch (error) {
      this.updateServiceState('networkMonitor', 'error', error as Error);
      logger.error(
        '[COLD START] Network monitoring initialization failed (non-critical):',
        error as Error
      );
      // Don't throw - network monitoring is not critical
    }
  }

  /**
   * Restore database sync state
   */
  private async restoreDatabaseSyncState(): Promise<void> {
    try {
      logger.debug('[COLD START] Restoring database sync state...');

      // Force a sync check to restore any pending mutations
      if (backgroundSyncService.isServiceInitialized()) {
        await backgroundSyncService.syncPendingMutations();
      }

      logger.debug('[COLD START] Database sync state restored');
    } catch (error) {
      logger.error(
        '[COLD START] Failed to restore database sync state (non-critical):',
        error as Error
      );
      // Don't throw - this is not critical
    }
  }

  /**
   * Optimize database connections (Stage 4)
   */
  private async optimizeDatabaseConnections(): Promise<void> {
    try {
      logger.debug('[COLD START] Optimizing database connections...');

      // Potential database optimizations could go here
      // For now, just log that optimization phase started

      logger.debug('[COLD START] Database connection optimization completed');
    } catch (error) {
      logger.error('[COLD START] Database optimization failed (non-critical):', error as Error);
      // Don't throw - optimizations are not critical
    }
  }

  /**
   * Start performance monitoring (Stage 4)
   */
  private async startPerformanceMonitoring(): Promise<void> {
    try {
      logger.debug('[COLD START] Starting performance monitoring...');

      // Performance monitoring could be implemented here
      // For now, just log that monitoring started

      logger.debug('[COLD START] Performance monitoring started');
    } catch (error) {
      logger.error(
        '[COLD START] Performance monitoring setup failed (non-critical):',
        error as Error
      );
      // Don't throw - monitoring is not critical
    }
  }

  /**
   * Update service state
   */
  private updateServiceState(
    serviceName: keyof InitializationState['services'] | string,
    status: ServiceState['status'],
    error?: Error
  ): void {
    const timestamp = Date.now();

    if (serviceName in this.state.services) {
      const service = this.state.services[serviceName as keyof InitializationState['services']];

      if (status === 'initializing') {
        service.startTime = timestamp;
      } else if (status === 'ready' || status === 'error') {
        service.endTime = timestamp;
      }

      service.status = status;
      if (error) {
        service.error = error;
      }
    }
  }

  /**
   * Calculate overall progress percentage
   */
  getProgress(): number {
    let completedStages = 0;
    const totalStages = 4;

    if (this.state.stage1Complete) {
      completedStages++;
    }
    if (this.state.stage2Complete) {
      completedStages++;
    }
    if (this.state.stage3Complete) {
      completedStages++;
    }
    if (this.state.stage4Complete) {
      completedStages++;
    }

    return Math.round((completedStages / totalStages) * 100);
  }

  /**
   * Get a human-readable summary of the current state
   */
  getSummary(): {
    progress: number;
    currentStage: InitializationStage;
    isComplete: boolean;
    errors: string[];
    services: Record<string, string>;
  } {
    const errors = Object.values(this.state.errors).map((error) => error.message);
    const services: Record<string, string> = {};

    Object.entries(this.state.services).forEach(([name, service]) => {
      services[name] = service.status;
    });

    return {
      progress: this.getProgress(),
      currentStage: this.state.currentStage,
      isComplete: this.state.isFullyInitialized,
      errors,
      services,
    };
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager();
