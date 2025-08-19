import Constants from 'expo-constants';
import { z } from 'zod';
import { logger } from './debugConfig';

// Schema for runtime configuration from Constants.expoConfig.extra
const RuntimeConfigSchema = z.object({
  environment: z.enum(['development', 'preview', 'production']),
  eas: z.object({
    projectId: z.string(),
  }),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB: z.string().optional(),
  EXPO_PUBLIC_REDIRECT_URI: z.string().optional(),
  EXPO_PUBLIC_ENABLE_ANALYTICS: z.string().optional(),
  EXPO_PUBLIC_ENABLE_THROWBACK: z.string().optional(),
  EXPO_PUBLIC_APPLE_SERVICES_ID: z.string().optional(),
});

type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

// Get runtime configuration from Expo Constants
const getRuntimeConfig = (): RuntimeConfig => {
  const extra = Constants.expoConfig?.extra;

  if (!extra) {
    throw new Error('❌ No runtime configuration found in Constants.expoConfig.extra');
  }

  try {
    return RuntimeConfigSchema.parse(extra);
  } catch (error) {
    logger.error('❌ Runtime configuration validation failed:', { error: String(error) });
    throw new Error('Invalid runtime configuration');
  }
};

const runtimeConfig = getRuntimeConfig();

// 🔒 CONFIGURATION EXPORT: Clean, validated configuration
export const config = {
  // App metadata from build configuration
  app: {
    environment: runtimeConfig.environment,
    version: Constants.expoConfig?.version || '1.0.0',
    name: Constants.expoConfig?.name || 'Yeşer',
    scheme: Constants.expoConfig?.scheme || 'yeser',
    bundleIdentifier:
      Constants.expoConfig?.ios?.bundleIdentifier ||
      Constants.expoConfig?.android?.package ||
      'com.arthlor.yeser',
  },

  // Development flags
  isDevelopment: runtimeConfig.environment === 'development',
  isPreview: runtimeConfig.environment === 'preview',
  isProduction: runtimeConfig.environment === 'production',

  // Supabase configuration
  supabase: {
    url: runtimeConfig.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: runtimeConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Google OAuth configuration
  google: {
    clientIdIOS: runtimeConfig.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    clientIdAndroid: runtimeConfig.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    clientIdWeb: runtimeConfig.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    redirectUri:
      runtimeConfig.EXPO_PUBLIC_REDIRECT_URI ||
      `${Constants.expoConfig?.scheme || 'yeser'}://auth/callback`,
  },

  // Apple OAuth configuration (Services ID primarily used in dashboard)
  apple: {
    servicesId: runtimeConfig.EXPO_PUBLIC_APPLE_SERVICES_ID,
    redirectUri:
      runtimeConfig.EXPO_PUBLIC_REDIRECT_URI ||
      `${Constants.expoConfig?.scheme || 'yeser'}://auth/callback`,
  },

  // EAS configuration
  eas: {
    projectId: runtimeConfig.eas.projectId,
    updatesUrl: `https://u.expo.dev/${runtimeConfig.eas.projectId}`,
  },

  // Feature flags
  features: {
    analyticsEnabled: runtimeConfig.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
    throwbackEnabled: runtimeConfig.EXPO_PUBLIC_ENABLE_THROWBACK === 'true',
    updatesEnabled: runtimeConfig.environment === 'production',
    crashReportingEnabled: runtimeConfig.environment === 'production',
  },
};

// 🔒 SECURITY AUDIT: Log configuration status without sensitive values
export const logConfigurationStatus = (): void => {
  logger.debug('🔒 Runtime Configuration Status:', {
    environment: config.app.environment,
    version: config.app.version,
    name: config.app.name,
    scheme: config.app.scheme,
    bundleId: config.app.bundleIdentifier,
  });

  logger.debug('Supabase Project:', {
    url: config.supabase.url ? '✅ Set' : '❌ Missing',
    anonKey: config.supabase.anonKey ? '✅ Set' : '❌ Missing',
  });

  logger.debug('Google OAuth:', {
    iOS: config.google.clientIdIOS ? '✅ Set' : '❌ Missing',
    Android: config.google.clientIdAndroid ? '✅ Set' : '❌ Missing',
    Web: config.google.clientIdWeb ? '✅ Set' : '❌ Missing',
  });

  logger.debug('Apple OAuth:', {
    servicesId: config.apple.servicesId ? '✅ Set' : '❌ Missing',
  });

  logger.debug('Feature Flags:', {
    analytics: config.features.analyticsEnabled ? '✅ Enabled' : '❌ Disabled',
    throwback: config.features.throwbackEnabled ? '✅ Enabled' : '❌ Disabled',
  });

  logger.debug('EAS Project:', {
    projectId: config.eas.projectId ? '✅ Set' : '❌ Missing',
  });
};
