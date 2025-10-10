import { logger } from '@/utils/debugConfig';
import i18n from '@/i18n';
import { AUTH_CONSTANTS } from './authConstants';

/**
 * Email validation utility
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: i18n.t('auth.validation.emailRequired') };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: i18n.t('auth.validation.emailInvalid') };
  }

  // Additional checks
  if (trimmedEmail.length > 320) {
    // RFC 5321 limit
    return { isValid: false, error: i18n.t('auth.validation.emailTooLong') };
  }

  return { isValid: true };
};

/**
 * Check if magic link can be sent (rate limiting)
 */
export const canSendMagicLink = (lastRequestTime: number | null): boolean => {
  if (!lastRequestTime) {
    return true;
  }

  return Date.now() - lastRequestTime > AUTH_CONSTANTS.MAGIC_LINK_COOLDOWN_MS;
};

/**
 * Get remaining cooldown time in seconds
 */
export const getMagicLinkCooldownRemaining = (lastRequestTime: number | null): number => {
  if (!lastRequestTime) {
    return 0;
  }

  const timeSinceLastRequest = Date.now() - lastRequestTime;
  const remainingTime = AUTH_CONSTANTS.MAGIC_LINK_COOLDOWN_MS - timeSinceLastRequest;

  return Math.max(0, Math.ceil(remainingTime / 1000));
};

/**
 * Validate magic link credentials
 */
export const validateMagicLinkCredentials = (credentials: {
  email: string;
  options?: {
    emailRedirectTo?: string;
    shouldCreateUser?: boolean;
    data?: Record<string, unknown>;
  };
}): { isValid: boolean; error?: string; sanitizedEmail?: string } => {
  const emailValidation = validateEmail(credentials.email);

  if (!emailValidation.isValid) {
    return { isValid: false, error: emailValidation.error };
  }

  // Sanitize email - remove invisible characters and normalize
  const sanitizedEmail = credentials.email
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters

  return {
    isValid: true,
    sanitizedEmail,
  };
};

/**
 * Validate redirect URI format
 */
export const validateRedirectUri = (uri?: string): { isValid: boolean; error?: string } => {
  if (!uri) {
    return { isValid: true }; // Optional parameter
  }

  try {
    const url = new URL(uri);

    // Check if it's a valid custom scheme or https
    if (!url.protocol.startsWith('yeser') && url.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'Redirect URI must use yeser:// scheme or https://',
      };
    }

    return { isValid: true };
  } catch (error) {
    logger.error('Invalid redirect URI format:', { uri, error: (error as Error).message });
    return {
      isValid: false,
      error: 'Invalid redirect URI format',
    };
  }
};

/**
 * Validate token hash format (for magic links)
 */
export const validateTokenHash = (tokenHash: string): { isValid: boolean; error?: string } => {
  if (!tokenHash || tokenHash.trim().length === 0) {
    return { isValid: false, error: 'Token hash is required' };
  }

  // Basic length check - Supabase tokens are typically longer than 20 characters
  if (tokenHash.length < 20) {
    return { isValid: false, error: 'Token hash too short' };
  }

  // Check for suspicious characters that might indicate tampering
  if (!/^[a-zA-Z0-9_-]+$/.test(tokenHash)) {
    return { isValid: false, error: 'Token hash contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Check if operation is expired based on timestamp
 */
export const isOperationExpired = (timestamp: number, maxAgeMs: number): boolean => {
  return Date.now() - timestamp > maxAgeMs;
};

/**
 * Sanitize user input for logging (remove sensitive data)
 */
export const sanitizeForLogging = (data: Record<string, unknown>): Record<string, unknown> => {
  const sanitized = { ...data };

  // Remove or mask sensitive fields
  const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token', 'email'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      if (field === 'email' && typeof sanitized[field] === 'string') {
        // Partially mask email
        const email = sanitized[field] as string;
        const [local, domain] = email.split('@');
        if (local && domain) {
          sanitized[field] = `${local.charAt(0)}***@${domain}`;
        }
      } else {
        sanitized[field] = '***';
      }
    }
  }

  return sanitized;
};
