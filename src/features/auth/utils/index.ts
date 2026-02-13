/**
 * Auth Utils Index
 *
 * Exports all authentication-related utilities
 */

// Atomic Operations
export { AtomicOperationManager, atomicOperationManager } from './atomicOperations';
export type { AtomicOperation } from './atomicOperations';

// Auth Constants
export { AUTH_CONSTANTS } from './authConstants';
export type {
  AuthMethod,
  OperationType,
  AuthCallbackParams,
  UrlProcessingState,
  GlobalErrorHandlers,
} from './authConstants';

// Auth Validation
export {
  validateEmail,
  validateRedirectUri,
  validateTokenHash,
  isOperationExpired,
  sanitizeForLogging,
} from './authValidation';
