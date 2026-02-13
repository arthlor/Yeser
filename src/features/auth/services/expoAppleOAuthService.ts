import { config } from '@/utils/config';
import { BaseExpoOAuthService, type OAuthResult } from './expoOAuthBase';

export type AppleOAuthResult = OAuthResult;

/**
 * Apple OAuth Service (Supabase-hosted OAuth flow)
 *
 * Uses Supabase's hosted OAuth for Apple and deep link handling, mirroring the Google flow.
 */
export class ExpoAppleOAuthService extends BaseExpoOAuthService {
  constructor() {
    super({
      provider: 'apple',
      operationKeyPrefix: 'expo_apple_oauth',
      operationType: 'google_oauth',
      scopes: 'name email',
      startFailedKey: 'auth.services.appleStartFailed',
      redirectMissingKey: 'auth.services.appleRedirectMissing',
      inProgressKey: 'auth.services.appleInProgress',
      networkErrorKey: 'auth.services.appleNetwork',
      genericErrorKey: 'auth.services.appleFailed',
      getRedirectUri: () => config.google.redirectUri,
    });
  }
}

export const expoAppleOAuthService = new ExpoAppleOAuthService();
