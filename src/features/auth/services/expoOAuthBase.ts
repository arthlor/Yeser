import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import i18n from '@/i18n';

import { logger } from '@/utils/debugConfig';
import { config } from '@/utils/config';
import { supabaseService } from '@/utils/supabaseClient';

import { atomicOperationManager } from '../utils/atomicOperations';
import { deepLinkService } from './deepLinkService';
import type { AtomicOperation } from '../utils/atomicOperations';

export interface OAuthResult {
  success: boolean;
  error?: string;
  user?: unknown;
  session?: unknown;
  userCancelled?: boolean;
  requiresCallback?: boolean;
}

interface OAuthServiceConfig {
  provider: 'google' | 'apple';
  operationKeyPrefix: string;
  operationType: AtomicOperation['type'];
  scopes: string;
  startFailedKey: string;
  redirectMissingKey: string;
  inProgressKey: string;
  networkErrorKey: string;
  genericErrorKey: string;
  validateConfig?: () => void;
  onInitialize?: () => void;
  getRedirectUri?: () => string | undefined;
}

export class BaseExpoOAuthService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private lastSignInAttempt: number | null = null;
  private readonly rateLimitMs: number;

  constructor(
    private readonly serviceConfig: OAuthServiceConfig,
    rateLimitMs: number = 3000
  ) {
    this.rateLimitMs = rateLimitMs;
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    const operationKey = `${this.serviceConfig.operationKeyPrefix}_init`;

    return await atomicOperationManager.ensureAtomicOperation(
      operationKey,
      this.serviceConfig.operationType,
      async () => {
        try {
          type MaybeCompleteAuthSession = { maybeCompleteAuthSession?: () => void };
          const maybeComplete = (WebBrowser as unknown as MaybeCompleteAuthSession)
            .maybeCompleteAuthSession;
          if (typeof maybeComplete === 'function') {
            maybeComplete();
          }

          if (this.serviceConfig.onInitialize) {
            this.serviceConfig.onInitialize();
          }

          if (this.serviceConfig.validateConfig) {
            this.serviceConfig.validateConfig();
          }

          const redirectUri = this.getRedirectUri();
          if (!redirectUri) {
            throw new Error('Redirect URI is not configured.');
          }

          // Note: Apple OAuth mostly targets iOS but we allow web flow on other platforms.
          if (this.serviceConfig.provider === 'apple' && Platform.OS !== 'ios') {
            logger.debug('Apple OAuth: Non-iOS platform detected, proceeding with web flow');
          }

          this.isInitialized = true;
        } catch (error) {
          logger.error(`Failed to initialize Expo ${this.serviceConfig.provider} OAuth service:`, {
            error,
          });
          throw error;
        }
      }
    );
  }

  async signIn(): Promise<OAuthResult> {
    const operationKey = `${this.serviceConfig.operationKeyPrefix}_signin`;

    try {
      return await atomicOperationManager.ensureAtomicOperation(
        operationKey,
        this.serviceConfig.operationType,
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

          try {
            const supabase = supabaseService.getClient();
            const redirectUri = this.getRedirectUri();
            if (!redirectUri) {
              throw new Error('Redirect URI is not configured.');
            }

            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: this.serviceConfig.provider,
              options: {
                redirectTo: redirectUri,
                skipBrowserRedirect: true,
                scopes: this.serviceConfig.scopes,
              },
            });

            if (error) {
              logger.error(`Expo ${this.serviceConfig.provider} OAuth: signInWithOAuth failed`, {
                error: error.message,
              });
              return { success: false, error: i18n.t(this.serviceConfig.startFailedKey) };
            }

            const authUrl = data?.url;
            if (!authUrl) {
              return {
                success: false,
                error: i18n.t(this.serviceConfig.redirectMissingKey),
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
            logger.error(`Expo ${this.serviceConfig.provider} OAuth: OAuth flow failed`, err);
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
        error: i18n.t(this.serviceConfig.inProgressKey),
      };
    }
  }

  private formatError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network')) {
      return i18n.t(this.serviceConfig.networkErrorKey);
    }

    return i18n.t(this.serviceConfig.genericErrorKey);
  }

  private canAttemptSignIn(): boolean {
    if (!this.lastSignInAttempt) {
      return true;
    }
    return Date.now() - this.lastSignInAttempt > this.rateLimitMs;
  }

  private getRemainingCooldown(): number {
    if (!this.lastSignInAttempt) {
      return 0;
    }
    const elapsed = Date.now() - this.lastSignInAttempt;
    return Math.max(0, this.rateLimitMs - elapsed);
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

  private getRedirectUri(): string | undefined {
    if (this.serviceConfig.getRedirectUri) {
      return this.serviceConfig.getRedirectUri();
    }
    return config.google.redirectUri;
  }
}
