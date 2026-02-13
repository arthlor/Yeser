import { appleOAuthService } from '../services';
import { createOAuthStore, type OAuthState } from './oauthStoreFactory';

export interface AppleOAuthState extends OAuthState {}

export const useAppleOAuthStore = createOAuthStore({
  providerLabel: 'Apple',
  operationKeyPrefix: 'apple_oauth',
  operationType: 'google_oauth',
  service: appleOAuthService,
  defaultErrorKey: 'auth.services.appleFailed',
  setAuthOnDirectSignIn: false,
});

export default useAppleOAuthStore;
