import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Linking } from 'react-native';
import { logger } from '@/utils/debugConfig';
import { analyticsService } from '@/services/analyticsService';
import { atomicOperationManager } from '../utils/atomicOperations';
import { config } from '@/utils/config';
import { supabaseService } from '@/utils/supabaseClient';
import { productionLogger } from '@/services/productionLogger';

/**
 * Google OAuth Result Interface
 */
export interface GoogleOAuthResult {
  success: boolean;
  error?: string;
  user?: unknown;
  session?: unknown;
  userCancelled?: boolean;
  requiresCallback?: boolean; // Indicates OAuth flow continues via deep link callback
}

/**
 * Google OAuth Service - Alternative Implementation
 *
 * Uses Supabase's native OAuth redirect flow instead of ID token exchange.
 * This approach is more reliable and handles the OAuth flow through Supabase directly.
 */
export class GoogleOAuthService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private lastSignInAttempt: number | null = null;
  private readonly RATE_LIMIT_MS = 3000; // 3 seconds between attempts

  /**
   * Initialize Google Sign-In SDK
   * Simplified initialization without complex cold start dependencies
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    const operationKey = 'google_oauth_init';
    return await atomicOperationManager.ensureAtomicOperation(
      operationKey,
      'google_oauth',
      async () => {
        try {
          logger.debug('Starting Google OAuth service initialization...');

          // Validate Google OAuth configuration
          const {
            web: webClientId,
            ios: iosClientId,
            android: androidClientId,
          } = config.oauth.googleClientIds;

          // Check required client IDs
          const missingIds: string[] = [];
          if (!webClientId) {
            missingIds.push('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB');
          }
          if (!iosClientId) {
            missingIds.push('EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS');
          }

          if (missingIds.length > 0) {
            const error = new Error(
              `Google OAuth client IDs not configured. Missing environment variables: ${missingIds.join(', ')}`
            );

            await productionLogger.logGoogleOAuthError({
              phase: 'initialization',
              originalError: error,
              configStatus: {
                hasWebClientId: !!webClientId,
                hasIosClientId: !!iosClientId,
                hasAndroidClientId: !!androidClientId,
              },
            });

            throw error;
          }

          // Warn if Android client ID is missing (not critical but should be set)
          if (!androidClientId) {
            logger.warn(
              'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID not set. Ensure SHA-1 fingerprints are configured in Google Cloud Console for Android support.'
            );
          }

          // Configure Google Sign-In with validated credentials
          GoogleSignin.configure({
            webClientId,
            iosClientId,
            offlineAccess: true,
            hostedDomain: '',
            forceCodeForRefreshToken: true,
            accountName: '',
          });

          this.isInitialized = true;
          logger.debug('Google OAuth service initialized successfully');
        } catch (error) {
          logger.error('Failed to initialize Google OAuth service:', { error });

          if (error instanceof Error) {
            await productionLogger.logGoogleOAuthError({
              phase: 'initialization',
              originalError: error,
              configStatus: {
                hasWebClientId: !!config.oauth.googleClientIds.web,
                hasIosClientId: !!config.oauth.googleClientIds.ios,
                hasAndroidClientId: !!config.oauth.googleClientIds.android,
              },
            });
          }

          throw error;
        }
      }
    );
  }

  /**
   * FIXED APPROACH 1: Supabase Native OAuth Redirect Flow with Proper URL Opening
   * This now actually opens the OAuth URL in the browser instead of just generating it
   */
  async signInWithSupabaseOAuth(): Promise<GoogleOAuthResult> {
    const operationKey = 'google_oauth_signin_supabase';

    try {
      return await atomicOperationManager.ensureAtomicOperation(
        operationKey,
        'google_oauth',
        async () => {
          // Rate limiting check
          if (!this.canAttemptSignIn()) {
            const remainingTime = this.getRemainingCooldown();
            logger.debug('Google OAuth: Rate limited', { remainingTime });
            return {
              success: false,
              error: `Lütfen ${Math.ceil(remainingTime / 1000)} saniye bekleyin ve tekrar deneyin.`,
            };
          }

          this.lastSignInAttempt = Date.now();

          logger.debug('Google OAuth: Starting Supabase native OAuth flow');
          analyticsService.logEvent('google_oauth_attempt');

          try {
            // Get Supabase client
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
              logger.error('Google OAuth: Supabase OAuth failed', {
                error: error.message,
                errorDetails: error,
              });
              analyticsService.logEvent('google_oauth_supabase_failed', {
                error: error.message,
              });
              return {
                success: false,
                error: 'Google ile giriş başlatılamadı. Lütfen tekrar deneyin.',
              };
            }

            if (data?.url) {
              logger.debug('Google OAuth: OAuth URL generated, attempting to open browser', {
                url: data.url.substring(0, 50) + '...',
              });

              try {
                // 🔥 CRITICAL FIX: Actually open the OAuth URL in the browser
                const canOpen = await Linking.canOpenURL(data.url);
                if (canOpen) {
                  await Linking.openURL(data.url);
                  logger.debug('Google OAuth: Browser opened successfully');
                  analyticsService.logEvent('google_oauth_browser_opened');

                  // Also log to production logger for debugging
                  await productionLogger.logGoogleOAuthError({
                    phase: 'signin',
                    originalError: new Error('OAuth browser opened successfully'),
                    configStatus: {
                      hasWebClientId: !!config.oauth.googleClientIds.web,
                      hasIosClientId: !!config.oauth.googleClientIds.ios,
                      hasAndroidClientId: !!config.oauth.googleClientIds.android,
                    },
                  });

                  // The OAuth flow will continue in the browser/webview
                  // Success will be handled via deep link callback
                  return {
                    success: true,
                    requiresCallback: true, // Indicates that success will come via deep link
                  };
                } else {
                  logger.error('Google OAuth: Cannot open OAuth URL');
                  analyticsService.logEvent('google_oauth_browser_failed', {
                    error: 'Cannot open URL',
                  });

                  // Log to production for debugging
                  await productionLogger.logGoogleOAuthError({
                    phase: 'signin',
                    originalError: new Error(
                      'Cannot open OAuth URL - Linking.canOpenURL returned false'
                    ),
                    configStatus: {
                      hasWebClientId: !!config.oauth.googleClientIds.web,
                      hasIosClientId: !!config.oauth.googleClientIds.ios,
                      hasAndroidClientId: !!config.oauth.googleClientIds.android,
                    },
                  });
                  // Fall through to return error
                }
              } catch (linkingError) {
                logger.error('Google OAuth: Failed to open OAuth URL', linkingError as Error);
                analyticsService.logEvent('google_oauth_browser_failed', {
                  error: (linkingError as Error).message,
                });

                // Log to production for debugging
                await productionLogger.logGoogleOAuthError({
                  phase: 'signin',
                  originalError: linkingError as Error,
                  configStatus: {
                    hasWebClientId: !!config.oauth.googleClientIds.web,
                    hasIosClientId: !!config.oauth.googleClientIds.ios,
                    hasAndroidClientId: !!config.oauth.googleClientIds.android,
                  },
                });
                // Fall through to return error
              }

              // If we reach here, browser opening failed
              return {
                success: false,
                error: 'Tarayıcı açılamadı. Lütfen tekrar deneyin.',
              };
            } else {
              return {
                success: false,
                error: 'OAuth URL oluşturulamadı. Lütfen tekrar deneyin.',
              };
            }
          } catch (error) {
            const err = error as Error;

            logger.error('Google OAuth: Native OAuth flow failed', err);
            analyticsService.logEvent('google_oauth_failed', {
              error: err.message,
              errorName: err.name,
            });

            return {
              success: false,
              error: this.formatError(err),
            };
          }
        }
      );
    } catch (error) {
      logger.debug('Google OAuth: Sign-in operation already in progress', {
        error: (error as Error).message,
      });
      return {
        success: false,
        error: 'Giriş işlemi devam ediyor. Lütfen bekleyin.',
      };
    }
  }

  /**
   * ALTERNATIVE APPROACH 2: Improved ID Token Exchange
   * Enhanced version of the current approach with better error handling
   */
  async signInWithIdTokenExchange(): Promise<GoogleOAuthResult> {
    const operationKey = 'google_oauth_signin_token';

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

          // Ensure initialization
          if (!this.isInitialized) {
            await this.initialize();
          }

          this.lastSignInAttempt = Date.now();

          logger.debug('Google OAuth: Starting improved ID token exchange flow');
          analyticsService.logEvent('google_oauth_attempt');

          try {
            // Check Play Services first
            logger.debug('Google OAuth: Checking Play Services...');
            await GoogleSignin.hasPlayServices();
            logger.debug('Google OAuth: Play Services available');

            // Don't force sign out - let user choose account if multiple exist
            // This was causing issues in the original implementation

            // Perform Google Sign-In
            const userInfo = await GoogleSignin.signIn();
            logger.debug('Google OAuth: Sign-in completed, extracting tokens...', {
              hasUserInfo: !!userInfo,
              hasData: !!userInfo.data,
              hasIdToken: !!userInfo.data?.idToken,
            });

            // Extract ID token from response (using the same method as original code)
            const idToken = userInfo.data?.idToken;

            if (!idToken) {
              logger.error('Google OAuth: No ID token found in response', {
                userInfo: JSON.stringify(userInfo, null, 2),
              });
              throw new Error('No ID token received from Google');
            }

            logger.debug('Google OAuth: ID token extracted, exchanging with Supabase...');

            // Get Supabase client and exchange token
            const supabase = supabaseService.getClient();
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
            });

            if (error) {
              logger.error('Google OAuth: Supabase exchange failed', {
                error: error.message,
                errorDetails: error,
              });
              analyticsService.logEvent('google_oauth_supabase_failed', {
                error: error.message,
              });
              return {
                success: false,
                error: 'Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.',
              };
            }

            if (data?.user && data?.session) {
              logger.debug('Google OAuth: Authentication completed successfully', {
                userId: data.session.user?.id,
              });
              analyticsService.logEvent('google_oauth_success');

              return {
                success: true,
                user: data.user,
                session: data.session,
              };
            } else {
              return {
                success: false,
                error: 'Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.',
              };
            }
          } catch (error) {
            const err = error as Error;

            logger.error('Google OAuth: Detailed error analysis', {
              message: err.message,
              name: err.name,
              stack: err.stack,
            });

            // Handle user cancellation gracefully
            if (this.isUserCancellation(err)) {
              logger.debug('Google OAuth: User cancelled sign-in');
              analyticsService.logEvent('google_oauth_cancelled');
              return {
                success: false,
                userCancelled: true,
              };
            }

            logger.error('Google OAuth: Sign-in failed', err);
            analyticsService.logEvent('google_oauth_failed', {
              error: err.message,
              errorName: err.name,
            });

            return {
              success: false,
              error: this.formatError(err),
            };
          }
        }
      );
    } catch (error) {
      logger.debug('Google OAuth: Sign-in operation already in progress', {
        error: (error as Error).message,
      });
      return {
        success: false,
        error: 'Giriş işlemi devam ediyor. Lütfen bekleyin.',
      };
    }
  }

  /**
   * Main sign-in method - uses the Supabase native OAuth approach by default with ID token fallback
   */
  async signIn(): Promise<GoogleOAuthResult> {
    // Try Supabase native OAuth first (recommended)
    const result = await this.signInWithSupabaseOAuth();

    // If native OAuth fails (but not user cancellation), fallback to ID token exchange
    if (!result.success && !result.userCancelled && !result.requiresCallback) {
      logger.debug('Google OAuth: Native OAuth failed, trying ID token exchange fallback', {
        error: result.error,
      });

      try {
        const fallbackResult = await this.signInWithIdTokenExchange();
        if (fallbackResult.success) {
          logger.debug('Google OAuth: ID token exchange fallback succeeded');
          analyticsService.logEvent('google_oauth_fallback_success');
        }
        return fallbackResult;
      } catch (fallbackError) {
        logger.error('Google OAuth: Both methods failed', fallbackError as Error);
        analyticsService.logEvent('google_oauth_all_methods_failed', {
          originalError: result.error || 'Unknown error',
          fallbackError: (fallbackError as Error).message,
        });
        return result; // Return original error
      }
    }

    return result;
  }

  /**
   * Check if user cancelled the OAuth flow
   */
  private isUserCancellation(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('cancel') ||
      message.includes('user_cancelled') ||
      message.includes('sign_in_cancelled') ||
      message.includes('dismissed')
    );
  }

  /**
   * Format error messages for user display
   */
  private formatError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network')) {
      return 'İnternet bağlantısı sorunu. Lütfen tekrar deneyin.';
    }

    if (message.includes('play_services')) {
      return 'Google Play Hizmetleri gerekli. Lütfen güncelleyin.';
    }

    if (message.includes('sign_in_required')) {
      return 'Google hesabınıza giriş yapmanız gerekiyor.';
    }

    return 'Google ile giriş yapılamadı. Lütfen tekrar deneyin.';
  }

  /**
   * Rate limiting helpers
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
   * Check if service is ready for use
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current status for monitoring
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
   * Cleanup method for testing/reset
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        await GoogleSignin.signOut();
      }
    } catch (error) {
      logger.debug('Google OAuth cleanup error (non-critical):', {
        message: (error as Error).message,
      });
    }

    this.isInitialized = false;
    this.initializationPromise = null;
    this.lastSignInAttempt = null;
  }
}

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService();
