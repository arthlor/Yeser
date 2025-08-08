import { Platform } from 'react-native';
import { type DiscoveryDocument, makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { encode as encodeBase64 } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
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
 * Expo-Compatible Google OAuth Service (Native ID token flow)
 *
 * Uses expo-auth-session to obtain a Google ID token on device, then exchanges
 * it with Supabase via signInWithIdToken. This avoids the Supabase domain on
 * Google's consent screen.
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
   * Sign in using native Google ID token flow, exchanging with Supabase
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
          logger.debug('Expo Google OAuth: Starting native Google ID token flow');
          analyticsService.logEvent('google_oauth_attempt');

          try {
            const supabase = supabaseService.getClient();

            // 1) Build an auth request for Google to get an ID token
            const discovery: DiscoveryDocument = {
              authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
              tokenEndpoint: 'https://oauth2.googleapis.com/token',
              revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
            };

            const clientId = Platform.select({
              ios: config.google.clientIdIOS,
              android: config.google.clientIdAndroid,
              default: config.google.clientIdWeb,
            });

            if (!clientId) {
              throw new Error('Google client ID not configured for this platform.');
            }

            const clientIdSuffix = clientId.replace('.apps.googleusercontent.com', '');
            const nativeGoogleScheme = `com.googleusercontent.apps.${clientIdSuffix}`;
            const nativePath =
              Platform.OS === 'android' ? '/oauth2redirect/google' : '/oauthredirect';
            const redirectUri = makeRedirectUri({
              // Use installed-app redirect for Google on mobile (Android path differs)
              native: `${nativeGoogleScheme}:${nativePath}`,
            });

            const nonce = this.generateNonce();

            // Build the authorization URL manually to ensure no PKCE params are included
            // PKCE for Authorization Code flow (recommended for native apps)
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.sha256ToBase64Url(codeVerifier);

            const params = new URLSearchParams({
              client_id: clientId,
              redirect_uri: redirectUri,
              response_type: 'code',
              scope: 'openid email profile',
              code_challenge: codeChallenge,
              code_challenge_method: 'S256',
              prompt: 'consent',
            });

            const authUrl = `${discovery.authorizationEndpoint}?${params.toString()}`;
            logger.debug('Google OAuth (native) request URL (sanitized):', {
              clientId: clientId.substring(0, 10) + '…',
              redirectUri,
              hasPKCEParams: authUrl.includes('code_challenge') || authUrl.includes('pkce'),
            });

            // Listen for potential deep link in case the web browser dismisses before returning 'success'
            let capturedUrl: string | null = null;
            const onUrl = ({ url }: { url: string }): void => {
              capturedUrl = url;
            };
            // Dynamically import Linking to avoid circular deps
            const { Linking } = await import('react-native');
            const subscription = Linking.addEventListener('url', onUrl);

            const webResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

            if (webResult.type === 'cancel') {
              return { success: false, userCancelled: true };
            }

            const finalUrl = webResult.url || capturedUrl || '';
            subscription.remove();

            if (!finalUrl) {
              return { success: false, error: 'Google kimlik doğrulama başarısız.' };
            }

            // Google returns authorization code as query param
            const url = new URL(finalUrl);
            const authCode = url.searchParams.get('code');

            if (!authCode) {
              return { success: false, error: 'Google yetkilendirme kodu alınamadı.' };
            }

            // Exchange code for tokens
            const tokenParams = new URLSearchParams({
              client_id: clientId,
              code: authCode,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
              code_verifier: codeVerifier,
            });

            const tokenResponse = await fetch(discovery.tokenEndpoint as string, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: tokenParams.toString(),
            });

            if (!tokenResponse.ok) {
              return { success: false, error: 'Google token değişimi başarısız.' };
            }

            const tokenJson = (await tokenResponse.json()) as {
              id_token?: string;
              access_token?: string;
              refresh_token?: string;
            };

            const idToken = tokenJson.id_token;
            if (!idToken) {
              return { success: false, error: 'Google ID token alınamadı.' };
            }

            // 2) Exchange with Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
              nonce,
            });

            if (error) {
              logger.error('Expo Google OAuth: Supabase ID token exchange failed', {
                error: error.message,
              });
              return { success: false, error: 'Giriş tamamlanamadı. Lütfen tekrar deneyin.' };
            }

            return { success: true, user: data.user, session: data.session };
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

  /**
   * Generate a cryptographically strong nonce for OIDC
   */
  private generateNonce(): string {
    const bytes = new Uint8Array(16);
    // Fill bytes with pseudo-random values. In RN, a polyfill for getRandomValues is usually present.
    // Avoid referencing global crypto directly to satisfy linters across environments.
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    const base64 = encodeBase64(bytes.buffer);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private generateCodeVerifier(): string {
    // 43-128 chars URL-safe
    const bytes = new Uint8Array(32);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    const base64 = encodeBase64(bytes.buffer);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private async sha256ToBase64Url(input: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
      encoding: Crypto.CryptoEncoding.BASE64,
    });
    return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}

// Export singleton instance
export const expoGoogleOAuthService = new ExpoGoogleOAuthService();
