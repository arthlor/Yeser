import React from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/api/queryClient';
import { logger } from '@/utils/debugConfig';
import useAuthStore from '@/store/authStore';
import type { UpdateProfilePayload } from '@/schemas/profileSchema';
import { supabaseService } from '@/utils/supabaseClient';

interface PendingMutation {
  id: string;
  type: 'add_statement' | 'edit_statement' | 'delete_statement' | 'update_profile';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface SyncQueueData {
  mutations: PendingMutation[];
  lastSyncAttempt: number;
}

const SYNC_QUEUE_KEY = '@background_sync_queue';
const MAX_RETRY_COUNT = 3;
const SYNC_RETRY_DELAY = 30000; // 30 seconds

// 🚨 COLD START FIX: Interface for initializable services
interface InitializableService {
  name: string;
  initialize(): Promise<void>;
  isServiceInitialized(): boolean;
}

class BackgroundSyncService implements InitializableService {
  name = 'backgroundSync';
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private initialized: boolean = false;
  private databaseReady: boolean = false;

  constructor() {
    // 🚨 COLD START FIX: No immediate operations in constructor
    // All initialization moved to initialize() method
  }

  /**
   * 🚨 COLD START FIX: Lazy initialization method
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('[COLD START] Background sync service already initialized');
      return;
    }

    try {
      logger.debug('[COLD START] Initializing background sync service...');

      // Ensure database connection is ready
      await this.ensureDatabaseReady();

      // Initialize network monitoring
      await this.initializeNetworkListener();

      // Load pending mutations from AsyncStorage
      await this.loadPendingMutations();

      // Start periodic sync
      await this.startPeriodicSync();

      this.initialized = true;
      logger.debug('[COLD START] Background sync service initialized successfully');
    } catch (error) {
      logger.error('[COLD START] Background sync service initialization failed:', error as Error);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure database connection is ready
   */
  private async ensureDatabaseReady(): Promise<void> {
    if (this.databaseReady) {
      return;
    }

    try {
      logger.debug('[COLD START] Ensuring database connection for background sync...');

      // Wait for Supabase client to be ready
      await supabaseService.initializeLazy();

      this.databaseReady = true;
      logger.debug('[COLD START] Database connection ready for background sync');
    } catch (error) {
      logger.error(
        '[COLD START] Failed to establish database connection for background sync:',
        error as Error
      );
      throw new Error('Database connection required for background sync');
    }
  }

  /**
   * Initialize network state monitoring (deferred)
   */
  private async initializeNetworkListener(): Promise<void> {
    try {
      logger.debug('[COLD START] Setting up network listener...');

      NetInfo.addEventListener((state) => {
        const wasOffline = !this.isOnline;
        this.isOnline = !!state.isConnected;

        logger.debug('Network state changed', {
          isConnected: this.isOnline,
          type: state.type,
          wasOffline,
        });

        // Trigger sync when coming back online
        if (wasOffline && this.isOnline) {
          logger.debug('Device came back online, triggering sync');
          this.syncPendingMutations();
        }
      });

      logger.debug('[COLD START] Network listener initialized');
    } catch (error) {
      logger.error('[COLD START] Failed to initialize network listener:', error as Error);
      throw error;
    }
  }

  /**
   * Load pending mutations from AsyncStorage (deferred)
   */
  private async loadPendingMutations(): Promise<void> {
    if (!this.databaseReady) {
      throw new Error('Database must be ready before loading pending mutations');
    }

    try {
      logger.debug('[COLD START] Loading pending mutations from AsyncStorage...');

      const pendingData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (pendingData) {
        const queueData: SyncQueueData = JSON.parse(pendingData);
        logger.debug('[COLD START] Loaded pending mutations:', {
          mutationCount: queueData.mutations.length,
        });
      } else {
        logger.debug('[COLD START] No pending mutations found');
      }
    } catch (error) {
      logger.error('[COLD START] Failed to load pending mutations:', error as Error);
      // Don't throw - app should continue without pending mutations
    }
  }

  /**
   * Start periodic sync for pending mutations (deferred)
   */
  private async startPeriodicSync(): Promise<void> {
    try {
      logger.debug('[COLD START] Starting periodic sync...');

      this.syncInterval = setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.syncPendingMutations();
        }
      }, SYNC_RETRY_DELAY);

      logger.debug('[COLD START] Periodic sync started');
    } catch (error) {
      logger.error('[COLD START] Failed to start periodic sync:', error as Error);
      throw error;
    }
  }

  /**
   * Stop periodic sync (for cleanup)
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.debug('Periodic sync stopped');
    }
  }

  /**
   * Add a mutation to the sync queue when offline
   */
  async queueMutation(type: PendingMutation['type'], data: Record<string, unknown>): Promise<void> {
    // Ensure service is initialized before queuing mutations
    if (!this.initialized) {
      logger.warn('Background sync service not initialized, attempting to initialize...');
      await this.initialize();
    }

    try {
      const mutation: PendingMutation = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const queueData = await this.getSyncQueue();
      queueData.mutations.push(mutation);

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queueData));

      logger.debug('Mutation queued for sync', {
        mutationId: mutation.id,
        type: mutation.type,
        queueLength: queueData.mutations.length,
      });
    } catch (error) {
      logger.error('Failed to queue mutation for sync', { error, type, data });
    }
  }

  /**
   * Sync all pending mutations
   */
  async syncPendingMutations(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    // Ensure service is initialized
    if (!this.initialized) {
      logger.warn('Sync requested but service not initialized');
      return;
    }

    this.isSyncing = true;

    try {
      const queueData = await this.getSyncQueue();

      if (queueData.mutations.length === 0) {
        this.isSyncing = false;
        return;
      }

      logger.debug('Starting sync of pending mutations', {
        mutationCount: queueData.mutations.length,
      });

      const successfulSyncs: string[] = [];
      const failedSyncs: PendingMutation[] = [];

      for (const mutation of queueData.mutations) {
        try {
          await this.executeMutation(mutation);
          successfulSyncs.push(mutation.id);
          logger.debug('Mutation synced successfully', { mutationId: mutation.id });
        } catch (error) {
          mutation.retryCount++;

          if (mutation.retryCount >= MAX_RETRY_COUNT) {
            logger.error('Mutation failed permanently after max retries', {
              mutationId: mutation.id,
              retryCount: mutation.retryCount,
              error,
            });
            successfulSyncs.push(mutation.id); // Remove from queue
          } else {
            failedSyncs.push(mutation);
            logger.warn('Mutation sync failed, will retry', {
              mutationId: mutation.id,
              retryCount: mutation.retryCount,
              error,
            });
          }
        }
      }

      // Update queue with only failed mutations
      const updatedQueueData: SyncQueueData = {
        mutations: failedSyncs,
        lastSyncAttempt: Date.now(),
      };

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueueData));

      logger.debug('Sync completed', {
        successful: successfulSyncs.length,
        failed: failedSyncs.length,
        remaining: failedSyncs.length,
      });

      // Invalidate relevant queries after successful sync
      if (successfulSyncs.length > 0) {
        await this.invalidateQueriesAfterSync();
      }
    } catch (error) {
      logger.error('Background sync failed', { error });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Execute a specific mutation
   */
  private async executeMutation(mutation: PendingMutation): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      throw new Error('User not authenticated for sync');
    }

    // Ensure database is ready
    if (!this.databaseReady) {
      await this.ensureDatabaseReady();
    }

    switch (mutation.type) {
      case 'add_statement': {
        const { addStatement } = await import('@/api/gratitudeApi');
        await addStatement(mutation.data.entryDate as string, mutation.data.statement as string);
        break;
      }

      case 'edit_statement': {
        const { editStatement } = await import('@/api/gratitudeApi');
        await editStatement(
          mutation.data.entryDate as string,
          mutation.data.statementIndex as number,
          mutation.data.updatedStatement as string
        );
        break;
      }

      case 'delete_statement': {
        const { deleteStatement } = await import('@/api/gratitudeApi');
        await deleteStatement(
          mutation.data.entryDate as string,
          mutation.data.statementIndex as number
        );
        break;
      }

      case 'update_profile': {
        const { updateProfile } = await import('@/api/profileApi');
        await updateProfile(mutation.data as UpdateProfilePayload);
        break;
      }

      default:
        throw new Error(`Unknown mutation type: ${mutation.type}`);
    }
  }

  /**
   * Get the current sync queue from AsyncStorage
   */
  private async getSyncQueue(): Promise<SyncQueueData> {
    try {
      const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (queueJson) {
        return JSON.parse(queueJson);
      }
      return { mutations: [], lastSyncAttempt: 0 };
    } catch (error) {
      logger.error('Failed to get sync queue from AsyncStorage', { error });
      return { mutations: [], lastSyncAttempt: 0 };
    }
  }

  /**
   * Clear the sync queue (for testing or reset)
   */
  async clearSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      logger.debug('Sync queue cleared');
    } catch (error) {
      logger.error('Failed to clear sync queue', { error });
    }
  }

  /**
   * Invalidate relevant queries after successful sync
   */
  private async invalidateQueriesAfterSync(): Promise<void> {
    try {
      // Invalidate queries that might be affected by background sync
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            queryKey.includes('gratitude') ||
            queryKey.includes('profile') ||
            queryKey.includes('streak')
          );
        },
      });

      logger.debug('Queries invalidated after successful background sync');
    } catch (error) {
      logger.error('Failed to invalidate queries after sync', { error });
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingMutations: number;
    lastSyncAttempt: number;
    isInitialized: boolean;
  }> {
    const queueData = await this.getSyncQueue();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingMutations: queueData.mutations.length,
      lastSyncAttempt: queueData.lastSyncAttempt,
      isInitialized: this.initialized,
    };
  }

  /**
   * Force sync now (for manual triggers)
   */
  async forceSyncNow(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.isOnline) {
      await this.syncPendingMutations();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }
}

// Create singleton instance
const backgroundSyncService = new BackgroundSyncService();

// Hook for React components
export const useBackgroundSync = () => {
  const [syncStatus, setSyncStatus] = React.useState({
    isOnline: true,
    isSyncing: false,
    pendingMutations: 0,
    lastSyncAttempt: 0,
    isInitialized: false,
  });

  const updateStatus = async () => {
    const status = await backgroundSyncService.getSyncStatus();
    setSyncStatus(status);
  };

  React.useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return {
    ...syncStatus,
    forceSyncNow: backgroundSyncService.forceSyncNow.bind(backgroundSyncService),
    clearQueue: backgroundSyncService.clearSyncQueue.bind(backgroundSyncService),
  };
};

export { backgroundSyncService };
