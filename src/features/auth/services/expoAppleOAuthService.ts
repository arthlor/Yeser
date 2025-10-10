import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import i18n from '@/i18n';

import { logger } from '@/utils/debugConfig';
import { config } from '@/utils/config';
import { supabaseService } from '@/utils/supabaseClient';

import { atomicOperationManager } from '../utils/atomicOperations';
import { deepLinkService } from './deepLinkService';

export interface AppleOAuthResult {
  success: boolean;
  error?: string;
  user?: unknown;
  session?: unknown;
  userCancelled?: boolean;
  requiresCallback?: boolean;
}

/**
 * Apple OAuth Service (Supabase-hosted OAuth flow)
 *
 * Uses Supabase's hosted OAuth for Apple and deep link handling, mirroring the Google flow.
 */
export class ExpoAppleOAuthService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private lastSignInAttempt: number | null = null;
  private readonly RATE_LIMIT_MS = 3000;

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    const operationKey = 'expo_apple_oauth_init';

    return await atomicOperationManager.ensureAtomicOperation(
      operationKey,
      'google_oauth',
      async () => {
        try {
          type MaybeCompleteAuthSession = { maybeCompleteAuthSession?: () => void };
          const maybeComplete = (WebBrowser as unknown as MaybeCompleteAuthSession)
            .maybeCompleteAuthSession;
          if (typeof maybeComplete === 'function') {
            maybeComplete();
          }

          const redirectUri = config.google.redirectUri; // Reuse unified redirect URI
          if (!redirectUri) {
            throw new Error('Redirect URI is not configured.');
          }

          // Basic platform hint – Apple Sign in primarily targets iOS
          if (Platform.OS !== 'ios') {
            logger.debug('Apple OAuth: Non-iOS platform detected, proceeding with web flow');
          }

          this.isInitialized = true;
        } catch (error) {
          logger.error('Failed to initialize Expo Apple OAuth service:', { error });
          throw error;
        }
      }
    );
  }

  async signIn(): Promise<AppleOAuthResult> {
    const operationKey = 'expo_apple_oauth_signin';

    try {
      return await atomicOperationManager.ensureAtomicOperation(
        operationKey,
        'google_oauth',
        async () => {
          if (!this.canAttemptSignIn()) {
            const remainingTime = this.getRemainingCooldown();
            return {
              success: false,
              error: i18n.t('auth.services.waitSeconds', {
                seconds: Math.ceil(remainingTime / 1000),
              }),
            };
          }

          this.lastSignInAttempt = Date.now();
          // Analytics disabled

          try {
            const supabase = supabaseService.getClient();
            const redirectUri = config.google.redirectUri;
            if (!redirectUri) {
              throw new Error('Redirect URI is not configured.');
            }

            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'apple',
              options: {
                redirectTo: redirectUri,
                skipBrowserRedirect: true,
                scopes: 'name email',
              },
            });

            if (error) {
              logger.error('Expo Apple OAuth: signInWithOAuth failed', { error: error.message });
              return { success: false, error: i18n.t('auth.services.appleStartFailed') };
            }

            const authUrl = data?.url;
            if (!authUrl) {
              return {
                success: false,
                error: i18n.t('auth.services.appleRedirectMissing'),
              };
            }

            const webResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
            if (webResult.type === 'cancel') {
              return { success: false, userCancelled: true };
            }

            if (webResult.type === 'success' && 'url' in webResult && webResult.url) {
              await deepLinkService.handleAuthCallback(webResult.url, true);
            }

            return { success: true, requiresCallback: true };
          } catch (oauthError) {
            const err = oauthError as Error;
            logger.error('Expo Apple OAuth: OAuth flow failed', err);
            return {
              success: false,
              error: this.formatError(err),
            };
          }
        }
      );
    } catch {
      return {
        success: false,
        error: i18n.t('auth.services.appleInProgress'),
      };
    }
  }

  private formatError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network')) {
      return i18n.t('auth.services.appleNetwork');
    }

    return i18n.t('auth.services.appleFailed');
  }

  private canAttemptSignIn(): boolean {
    if (!this.lastSignInAttempt) {
      return true;
    }
    return Date.now() - this.lastSignInAttempt > this.RATE_LIMIT_MS;
  }

  private getRemainingCooldown(): number {
    if (!this.lastSignInAttempt) {
      return 0;
    }
    const elapsed = Date.now() - this.lastSignInAttempt;
    return Math.max(0, this.RATE_LIMIT_MS - elapsed);
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getStatus(): {
    isInitialized: boolean;
    canSignIn: boolean;
    remainingCooldown: number;
  } {
    return {
      isInitialized: this.isInitialized,
      canSignIn: this.canAttemptSignIn(),
      remainingCooldown: this.getRemainingCooldown(),
    };
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.lastSignInAttempt = null;
  }
}

export const expoAppleOAuthService = new ExpoAppleOAuthService();
