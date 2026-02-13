import { googleOAuthService } from '../services';
import { createOAuthStore, type OAuthState } from './oauthStoreFactory';

/**
 * Google OAuth State Interface
 * Handles Google OAuth specific operations and state
 */
export interface GoogleOAuthState extends OAuthState {}

/**
 * Google OAuth Store
 *
 * Handles all Google OAuth related operations including:
 * - Google Sign-In SDK initialization
 * - OAuth sign-in flow
 * - Rate limiting and cooldown management
 * - Error handling specific to Google OAuth
 * - Integration with core auth store
 */
export const useGoogleOAuthStore = createOAuthStore({
  providerLabel: 'Google',
  operationKeyPrefix: 'google_oauth',
  operationType: 'google_oauth',
  service: googleOAuthService,
  defaultErrorKey: 'auth.services.googleFailed',
});

// Export default for backward compatibility
export default useGoogleOAuthStore;
