import React from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { logger } from '@/utils/debugConfig';
import useAuthStore from '@/store/authStore';
import type { UpdateProfilePayload } from '@/schemas/profileSchema';

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

const SYNC_QUEUE_KEY = 'yeser_sync_queue';
const MAX_RETRY_COUNT = 3;
const SYNC_RETRY_DELAY = 30000; // 30 seconds

class BackgroundSyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeNetworkListener();
    this.startPeriodicSync();
  }

  /**
   * Initialize network state monitoring
   */
  private initializeNetworkListener() {
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
  }

  /**
   * Start periodic sync for pending mutations
   */
  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingMutations();
      }
    }, SYNC_RETRY_DELAY);
  }

  /**
   * Stop periodic sync (for cleanup)
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Add a mutation to the sync queue when offline
   */
  async queueMutation(type: PendingMutation['type'], data: Record<string, unknown>): Promise<void> {
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
   * Get current sync queue
   */
  private async getSyncQueue(): Promise<SyncQueueData> {
    try {
      const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (queueJson) {
        return JSON.parse(queueJson);
      }
    } catch (error) {
      logger.error('Failed to get sync queue', { error });
    }

    return { mutations: [], lastSyncAttempt: 0 };
  }

  /**
   * Clear all pending mutations (for logout)
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
   * Invalidate queries after successful sync
   */
  private async invalidateQueriesAfterSync(): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      return;
    }

    // Invalidate all user-related queries to refetch fresh data
    await queryClient.invalidateQueries({
      queryKey: queryKeys.gratitudeEntries(user.id),
    });

    await queryClient.invalidateQueries({
      queryKey: queryKeys.streaks(user.id),
    });

    await queryClient.invalidateQueries({
      queryKey: queryKeys.profile(user.id),
    });

    logger.debug('Queries invalidated after sync');
  }

  /**
   * Get sync status information
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingMutations: number;
    lastSyncAttempt: number;
  }> {
    const queueData = await this.getSyncQueue();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingMutations: queueData.mutations.length,
      lastSyncAttempt: queueData.lastSyncAttempt,
    };
  }

  /**
   * Force a manual sync
   */
  async forceSyncNow(): Promise<void> {
    logger.debug('Manual sync triggered');
    await this.syncPendingMutations();
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();

// Hook for React components to access sync status
export const useBackgroundSync = () => {
  const [syncStatus, setSyncStatus] = React.useState({
    isOnline: true,
    isSyncing: false,
    pendingMutations: 0,
    lastSyncAttempt: 0,
  });

  React.useEffect(() => {
    const updateStatus = async () => {
      const status = await backgroundSyncService.getSyncStatus();
      setSyncStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    ...syncStatus,
    forceSyncNow: backgroundSyncService.forceSyncNow.bind(backgroundSyncService),
  };
};
