import { Linking } from 'react-native';
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
 * Expo-Compatible Google OAuth Service
 *
 * Removes dependency on @react-native-google-signin/google-signin
 * Uses pure Supabase OAuth flow with expo-web-browser for better UX
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

          // Validate Google OAuth configuration
          const { web: webClientId } = config.oauth.googleClientIds;

          if (!webClientId) {
            const error = new Error(
              'Google OAuth web client ID not configured. Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB'
            );
            throw error;
          }

          // No SDK configuration needed - pure Supabase approach
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
   * Sign in using pure Supabase OAuth flow
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

          logger.debug('Expo Google OAuth: Starting Supabase OAuth flow');
          analyticsService.logEvent('google_oauth_attempt');

          try {
            const supabase = supabaseService.getClient();

            // Use Supabase's native OAuth flow
            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: config.oauth.redirectUri || 'yeser://auth/callback',
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent',
                },
              },
            });

            if (error) {
              logger.error('Expo Google OAuth: Supabase OAuth failed', {
                error: error.message,
              });
              return {
                success: false,
                error: 'Google ile giriş başlatılamadı. Lütfen tekrar deneyin.',
              };
            }

            if (data?.url) {
              try {
                // Option 1: Use expo-web-browser for better UX (recommended)
                const canUseWebBrowser = await this.tryWebBrowserAuth(data.url);
                if (canUseWebBrowser) {
                  return {
                    success: true,
                    requiresCallback: true,
                  };
                }

                // Option 2: Fallback to Linking (current approach)
                const canOpen = await Linking.canOpenURL(data.url);
                if (canOpen) {
                  await Linking.openURL(data.url);
                  return {
                    success: true,
                    requiresCallback: true,
                  };
                }
              } catch (linkingError) {
                logger.error('Expo Google OAuth: Failed to open OAuth URL', linkingError as Error);
              }

              return {
                success: false,
                error: 'Tarayıcı açılamadı. Lütfen tekrar deneyin.',
              };
            }

            return {
              success: false,
              error: 'OAuth URL oluşturulamadı. Lütfen tekrar deneyin.',
            };
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
   * Try using expo-web-browser for better OAuth UX
   */
  private async tryWebBrowserAuth(url: string): Promise<boolean> {
    try {
      // Dynamic import to avoid build issues if expo-web-browser not installed
      const WebBrowser = await import('expo-web-browser');

      // Use expo-web-browser for in-app browser experience
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        config.oauth.redirectUri || 'yeser://auth/callback'
      );

      logger.debug('Expo Google OAuth: WebBrowser result', { type: result.type });

      if (result.type === 'success') {
        // Deep link will handle the success callback
        return true;
      } else if (result.type === 'cancel') {
        // User cancelled - this is handled by the caller
        return false;
      }

      return false;
    } catch (webBrowserError) {
      logger.debug('expo-web-browser not available, falling back to Linking', {
        error: (webBrowserError as Error).message,
      });
      return false;
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
}

// Export singleton instance
export const expoGoogleOAuthService = new ExpoGoogleOAuthService();
