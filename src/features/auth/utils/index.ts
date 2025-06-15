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
  MagicLinkRequest,
  UrlProcessingState,
  QueuedOTPToken,
  GlobalErrorHandlers,
} from './authConstants';

// Auth Validation
export {
  validateEmail,
  canSendMagicLink,
  getMagicLinkCooldownRemaining,
  validateMagicLinkCredentials,
  validateRedirectUri,
  validateTokenHash,
  isOperationExpired,
  sanitizeForLogging,
} from './authValidation';
