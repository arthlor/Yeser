import { logger } from '@/utils/debugConfig';

export interface AtomicOperation {
  type:
    | 'magic_link'
    | 'auth_init'
    | 'logout'
    | 'session_tokens'
    | 'confirm_magic_link'
    | 'magic_link_send'
    | 'magic_link_confirm'
    | 'google_oauth'
    | 'apple_oauth';
  timestamp: number;
  promise: Promise<unknown>;
}

export class AtomicOperationManager {
  private currentOperations = new Map<string, AtomicOperation>();

  async ensureAtomicOperation<T>(
    key: string,
    type: AtomicOperation['type'],
    operation: () => Promise<T>
  ): Promise<T> {
    const existingOperation = this.currentOperations.get(key);
    if (existingOperation) {
      logger.debug(`Atomic operation ${key} already in progress, sharing result...`);
      try {
        // SAFETY FIX: Only share results for operations with exact same key and type
        // This prevents type mismatches by ensuring operations are truly identical
        if (existingOperation.type === type) {
          const result = await existingOperation.promise;
          logger.debug(`Atomic operation ${key} shared successfully`);
          // Type assertion is safer here because we verify the operation type matches
          return result as T;
        } else {
          logger.warn(
            `Atomic operation ${key} type mismatch: ${existingOperation.type} vs ${type}`
          );
          // Different types - create new operation with unique key to avoid conflicts
          const uniqueKey = `${key}_${Date.now()}`;
          return this.ensureAtomicOperation(uniqueKey, type, operation);
        }
      } catch {
        // If the existing operation failed, allow this one to proceed
        logger.debug(`Existing atomic operation ${key} failed, proceeding with new attempt`);
        this.currentOperations.delete(key);
      }
    }

    const operationPromise = operation();
    this.currentOperations.set(key, {
      type,
      timestamp: Date.now(),
      promise: operationPromise as Promise<unknown>,
    });

    try {
      const result = await operationPromise;
      return result;
    } finally {
      this.cleanupAtomicOperation(key);
    }
  }

  /**
   * Cancel all operations of a specific type
   */
  cancelOperationsOfType(type: AtomicOperation['type']): void {
    for (const [key, operation] of this.currentOperations) {
      if (operation.type === type) {
        logger.debug(`Cancelling atomic operation: ${key} of type: ${type}`);
        this.currentOperations.delete(key);
      }
    }
  }

  /**
   * Check if an operation of specific type is in progress
   */
  hasOperationOfType(type: AtomicOperation['type']): boolean {
    for (const [, operation] of this.currentOperations) {
      if (operation.type === type) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all current operations (for debugging)
   */
  getCurrentOperations(): Map<string, AtomicOperation> {
    return new Map(this.currentOperations);
  }

  /**
   * Enhanced cleanup utility with stale operation detection
   */
  private cleanupAtomicOperation(key: string): void {
    const operation = this.currentOperations.get(key);
    if (operation && Date.now() - operation.timestamp > 30000) {
      // Clean up operations older than 30 seconds (prevent memory leaks)
      logger.warn(`Cleaning up stale atomic operation: ${key}`, {
        type: operation.type,
        age: Date.now() - operation.timestamp,
      });
    }
    this.currentOperations.delete(key);
  }

  /**
   * Cleanup all expired operations (can be called periodically)
   */
  cleanupExpiredOperations(): void {
    const now = Date.now();
    for (const [key, operation] of this.currentOperations) {
      if (now - operation.timestamp > 30000) {
        logger.warn(`Cleaning up expired atomic operation: ${key}`, {
          type: operation.type,
          age: now - operation.timestamp,
        });
        this.currentOperations.delete(key);
      }
    }
  }
}

// Export singleton instance
export const atomicOperationManager = new AtomicOperationManager();
