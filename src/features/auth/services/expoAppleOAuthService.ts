import { config } from '@/utils/config';
import { BaseExpoOAuthService, type OAuthResult } from './expoOAuthBase';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { supabaseService } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';

export type AppleOAuthResult = OAuthResult;

/**
 * Apple OAuth Service
 *
 * Uses native Expo Apple Authentication for iOS, gracefully falling back to Supabase's
 * hosted web OAuth flow on other platforms.
 */
export class ExpoAppleOAuthService extends BaseExpoOAuthService {
  constructor() {
    super({
      provider: 'apple',
      operationKeyPrefix: 'expo_apple_oauth',
      operationType: 'apple_oauth',
      scopes: 'name email',
      startFailedKey: 'auth.services.appleStartFailed',
      redirectMissingKey: 'auth.services.appleRedirectMissing',
      inProgressKey: 'auth.services.appleInProgress',
      networkErrorKey: 'auth.services.appleNetwork',
      genericErrorKey: 'auth.services.appleFailed',
      getRedirectUri: () => config.apple.redirectUri,
    });
  }

  override async signIn(): Promise<AppleOAuthResult> {
    if (Platform.OS !== 'ios') {
      logger.debug('Platform is not iOS, using web-based Apple OAuth fallback');
      return super.signIn();
    }

    try {
      logger.debug('Checking if Apple Authentication is available natively');
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Apple Authentication is not available on this device.' };
      }

      logger.debug('Starting native Apple OAuth flow');
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        return { success: false, error: 'No identity token returned from Apple.' };
      }

      logger.debug('Apple authentication successful, passing identity token to Supabase');
      const supabase = supabaseService.getClient();
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        logger.error('Native Apple OAuth succeeded, but Supabase ID Token validation failed:', {
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      logger.debug('Supabase session established via native Apple Auth token seamlessly');
      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') {
        logger.debug('User cancelled native Apple Sign In flow');
        return { success: false, userCancelled: true };
      }
      const errorMessage =
        e instanceof Error ? e.message : 'An error occurred during Apple Sign In';
      logger.error('Apple Native OAuth Error:', { error: errorMessage || e });
      return { success: false, error: errorMessage };
    }
  }
}

export const expoAppleOAuthService = new ExpoAppleOAuthService();
