// src/services/ServiceManager.ts
// 🚨 COLD START FIX: 4-Stage Service Manager
// This implements the staged initialization system to prevent AsyncStorage deadlocks

import { logger } from '@/utils/debugConfig';
import { supabaseService } from '@/utils/supabaseClient';
import { backgroundSyncService } from './backgroundSyncService';
import { firebaseService } from './firebaseService';
import { networkMonitorService } from './networkMonitorService';
import { notificationService } from './notificationService';

export type InitializationStage = 1 | 2 | 3 | 4;

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
    firebase: ServiceState;
    networkMonitor: ServiceState;
    notifications: ServiceState;
  };

  errors: Record<string, Error>;
  currentStage: InitializationStage;
}

interface ServiceState {
  status: 'pending' | 'initializing' | 'ready' | 'error';
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
      firebase: { status: 'pending' },
      networkMonitor: { status: 'pending' },
      notifications: { status: 'pending' },
    },
    errors: {},
    currentStage: 1,
  };

  private stageTimeouts: Record<InitializationStage, number> = {
    1: 0, // Immediate UI
    2: 500, // Core services after 500ms
    3: 2000, // Background services after 2s
    4: 5000, // Enhancements after 5s
  };

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

      // 3. Initialize Firebase Core (lightweight)
      await this.initializeFirebaseCore();

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
      throw error;
    }
  }

  /**
   * Stage 3: Background Services + Database Sync (2000ms)
   * Goal: Non-critical features with database sync
   */
  async initializeStage3(): Promise<void> {
    if (!this.state.databaseConnected) {
      throw new Error('Database connection required for Stage 3');
    }

    logger.debug('[COLD START] Stage 3: Background services + database sync starting...');
    const startTime = Date.now();

    try {
      // 1. Initialize background sync with database operations
      await this.initializeBackgroundSync();

      // 2. Initialize network monitoring
      await this.initializeNetworkMonitoring();

      // 3. Initialize notification service
      await this.initializeNotificationService();

      // 4. Restore database sync state
      await this.restoreDatabaseSyncState();

      this.state.stage3Complete = true;
      this.state.databaseSyncComplete = true;
      this.state.currentStage = 4;

      const duration = Date.now() - startTime;
      logger.debug('[COLD START] Stage 3 completed successfully', {
        duration: `${duration}ms`,
        nextStage: 4,
        databaseSyncComplete: true,
      });
    } catch (error) {
      logger.error('[COLD START] Stage 3 failed:', error as Error);
      this.state.errors.stage3 = error as Error;
      // Don't throw - app should continue with limited features
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
      // 1. Initialize Firebase Analytics (non-blocking)
      await this.initializeFirebaseAnalytics();

      // 2. Optimize database connections
      await this.optimizeDatabaseConnections();

      // 3. Start performance monitoring
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
   * Initialize Firebase core services
   */
  private async initializeFirebaseCore(): Promise<void> {
    this.updateServiceState('firebase', 'initializing');

    try {
      // Initialize core Firebase (not analytics yet)
      await firebaseService.initializeFirebase();

      this.updateServiceState('firebase', 'ready');
      logger.debug('[COLD START] Firebase core initialized successfully');
    } catch (error) {
      this.updateServiceState('firebase', 'error', error as Error);
      logger.error(
        '[COLD START] Firebase core initialization failed (non-critical):',
        error as Error
      );
      // Don't throw - Firebase is not critical for core functionality
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
   * Initialize notification service
   */
  private async initializeNotificationService(): Promise<void> {
    this.updateServiceState('notifications', 'initializing');

    try {
      await notificationService.initialize();

      this.updateServiceState('notifications', 'ready');
      logger.debug('[COLD START] Notification service initialized successfully');
    } catch (error) {
      this.updateServiceState('notifications', 'error', error as Error);
      logger.error(
        '[COLD START] Notification service initialization failed (non-critical):',
        error as Error
      );
      // Don't throw - notifications are not critical
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
   * Initialize Firebase Analytics (Stage 4)
   */
  private async initializeFirebaseAnalytics(): Promise<void> {
    try {
      logger.debug('[COLD START] Initializing Firebase Analytics...');

      // Initialize analytics (non-blocking)
      firebaseService.initialize().catch((error) => {
        logger.error(
          '[COLD START] Firebase Analytics initialization failed (non-critical):',
          error as Error
        );
      });

      logger.debug('[COLD START] Firebase Analytics initialization started');
    } catch (error) {
      logger.error('[COLD START] Firebase Analytics setup failed (non-critical):', error as Error);
      // Don't throw - analytics are not critical
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
   * Get initialization progress percentage
   */
  getProgress(): number {
    let completed = 0;
    const total = 4;

    if (this.state.stage1Complete) {
      completed++;
    }
    if (this.state.stage2Complete) {
      completed++;
    }
    if (this.state.stage3Complete) {
      completed++;
    }
    if (this.state.stage4Complete) {
      completed++;
    }

    return Math.round((completed / total) * 100);
  }

  /**
   * Get initialization summary
   */
  getSummary(): {
    progress: number;
    currentStage: InitializationStage;
    isComplete: boolean;
    errors: string[];
    services: Record<string, string>;
  } {
    return {
      progress: this.getProgress(),
      currentStage: this.state.currentStage,
      isComplete: this.state.isFullyInitialized,
      errors: Object.keys(this.state.errors),
      services: Object.entries(this.state.services).reduce(
        (acc, [name, state]) => {
          acc[name] = state.status;
          return acc;
        },
        {} as Record<string, string>
      ),
    };
  }
}

// Create singleton instance
export const serviceManager = new ServiceManager();
