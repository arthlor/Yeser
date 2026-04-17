import { appleOAuthService } from '../services';
import { createOAuthStore, type OAuthState } from './oauthStoreFactory';

export interface AppleOAuthState extends OAuthState {}

export const useAppleOAuthStore = createOAuthStore({
  providerLabel: 'Apple',
  operationKeyPrefix: 'apple_oauth',
  operationType: 'apple_oauth',
  service: appleOAuthService,
  defaultErrorKey: 'auth.services.appleFailed',
});

export default useAppleOAuthStore;
