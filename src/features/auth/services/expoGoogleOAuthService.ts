import { Platform } from 'react-native';
import { config } from '@/utils/config';
import { BaseExpoOAuthService, type OAuthResult } from './expoOAuthBase';

/**
 * Google OAuth Result Interface (same as existing)
 */
export type GoogleOAuthResult = OAuthResult;

/**
 * Google OAuth Service (Supabase-hosted OAuth flow)
 *
 * Uses Supabase's hosted OAuth for Google and deep link handling. This approach
 * avoids Android custom scheme fragility and works reliably across builds.
 */
export class ExpoGoogleOAuthService extends BaseExpoOAuthService {
  constructor() {
    super({
      provider: 'google',
      operationKeyPrefix: 'expo_google_oauth',
      operationType: 'google_oauth',
      scopes: 'openid email profile',
      startFailedKey: 'auth.services.googleStartFailed',
      redirectMissingKey: 'auth.services.googleRedirectMissing',
      inProgressKey: 'auth.services.googleInProgress',
      networkErrorKey: 'auth.services.googleNetwork',
      genericErrorKey: 'auth.services.googleFailed',
      validateConfig: () => {
        const clientIdIOS = config.google.clientIdIOS;
        const clientIdAndroid = config.google.clientIdAndroid;

        if (Platform.OS === 'ios' && !clientIdIOS) {
          throw new Error(
            'Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS in environment for iOS platform.'
          );
        }
        if (Platform.OS === 'android' && !clientIdAndroid) {
          throw new Error(
            'Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID in environment for Android platform.'
          );
        }
      },
      getRedirectUri: () => config.google.redirectUri,
    });
  }
}

// Export singleton instance
export const expoGoogleOAuthService = new ExpoGoogleOAuthService();
