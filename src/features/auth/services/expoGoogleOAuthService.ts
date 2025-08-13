import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { logger } from '@/utils/debugConfig';
import { analyticsService } from '@/services/analyticsService';
import { atomicOperationManager } from '../utils/atomicOperations';
import { config } from '@/utils/config';
import { supabaseService } from '@/utils/supabaseClient';

/**
 * Google OAuth Result Interface (same as existing)
 */
export interface GoogleOAuthResult {
  success: boolean;
  error?: string;
  user?: unknown;
  session?: unknown;
  userCancelled?: boolean;
  requiresCallback?: boolean;
}

/**
 * Google OAuth Service (Supabase-hosted OAuth flow)
 *
 * Uses Supabase's hosted OAuth for Google and deep link handling. This approach
 * avoids Android custom scheme fragility and works reliably across builds.
 */
export class ExpoGoogleOAuthService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private lastSignInAttempt: number | null = null;
  private readonly RATE_LIMIT_MS = 3000;

  /**
   * Initialize service - no more Google Sign-In SDK dependency
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    const operationKey = 'expo_google_oauth_init';

    return await atomicOperationManager.ensureAtomicOperation(
      operationKey,
      'google_oauth',
      async () => {
        try {
          logger.debug('Starting Expo Google OAuth service initialization...');
          // Complete any pending web-browser auth sessions (no-op if none)
          type MaybeCompleteAuthSession = { maybeCompleteAuthSession?: () => void };
          const maybeComplete = (WebBrowser as unknown as MaybeCompleteAuthSession)
            .maybeCompleteAuthSession;
          if (typeof maybeComplete === 'function') {
            maybeComplete();
          }

          // Validate Google OAuth configuration (platform-specific client IDs)
          const clientIdIOS = config.google.clientIdIOS;
          const clientIdAndroid = config.google.clientIdAndroid;
          const clientIdWeb = config.google.clientIdWeb;

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
          if (!clientIdWeb) {
            // Web client is optional here but useful if you later support web
            logger.debug('Google Web client id not provided; native flow will continue.');
          }

          this.isInitialized = true;
          logger.debug('Expo Google OAuth service initialized successfully');
        } catch (error) {
          logger.error('Failed to initialize Expo Google OAuth service:', { error });
          throw error;
        }
      }
    );
  }

  /**
   * Sign in using Supabase-hosted OAuth; tokens return via deep link
   */
  async signIn(): Promise<GoogleOAuthResult> {
    const operationKey = 'expo_google_oauth_signin';

    try {
      return await atomicOperationManager.ensureAtomicOperation(
        operationKey,
        'google_oauth',
        async () => {
          // Rate limiting check
          if (!this.canAttemptSignIn()) {
            const remainingTime = this.getRemainingCooldown();
            return {
              success: false,
              error: `Lütfen ${Math.ceil(remainingTime / 1000)} saniye bekleyin ve tekrar deneyin.`,
            };
          }

          this.lastSignInAttempt = Date.now();
          logger.debug('Expo Google OAuth: Starting Supabase-hosted OAuth flow');
          analyticsService.logEvent('google_oauth_attempt');

          try {
            const supabase = supabaseService.getClient();
            const redirectUri = config.google.redirectUri;
            if (!redirectUri) {
              throw new Error('Redirect URI is not configured.');
            }

            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: redirectUri,
                skipBrowserRedirect: true,
                scopes: 'openid email profile',
              },
            });

            if (error) {
              logger.error('Expo Google OAuth: signInWithOAuth failed', { error: error.message });
              return { success: false, error: 'Google ile giriş başlatılamadı.' };
            }

            const authUrl = data?.url;
            if (!authUrl) {
              return {
                success: false,
                error: 'Google ile giriş için yönlendirme adresi alınamadı.',
              };
            }

            const webResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
            if (webResult.type === 'cancel') {
              return { success: false, userCancelled: true };
            }

            // Tokens will be delivered to redirectUri and processed by deepLinkService
            return { success: true, requiresCallback: true };
          } catch (oauthError) {
            const err = oauthError as Error;
            logger.error('Expo Google OAuth: OAuth flow failed', err);
            return {
              success: false,
              error: this.formatError(err),
            };
          }
        }
      );
    } catch (atomicError) {
      logger.debug('Expo Google OAuth: Operation already in progress', {
        error: (atomicError as Error).message,
      });
      return {
        success: false,
        error: 'Giriş işlemi devam ediyor. Lütfen bekleyin.',
      };
    }
  }

  /**
   * Format error messages for user display
   */
  private formatError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network')) {
      return 'İnternet bağlantısı sorunu. Lütfen tekrar deneyin.';
    }

    return 'Google ile giriş yapılamadı. Lütfen tekrar deneyin.';
  }

  /**
   * Rate limiting helpers (same as existing)
   */
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

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current status
   */
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

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.lastSignInAttempt = null;
  }

  // PKCE helpers removed in hosted OAuth approach
}

// Export singleton instance
export const expoGoogleOAuthService = new ExpoGoogleOAuthService();
