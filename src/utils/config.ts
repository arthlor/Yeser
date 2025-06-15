import { z } from 'zod';
import Constants from 'expo-constants';

import { logger } from '@/utils/debugConfig';

// Get environment variables from Expo Constants in production or process.env in development
const getEnvVar = (key: string): string | undefined => {
  // In production builds, use expo-constants which includes bundled env vars
  const expoEnv = Constants.expoConfig?.extra?.env?.[key];
  if (expoEnv) {
    return expoEnv;
  }

  // Fallback to process.env for development
  return process.env[key];
};

// Environment variable schema for validation
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL').optional(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required').optional(),
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API key is required').optional(),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase project ID is required').optional(),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: z
    .string()
    .min(1, 'Firebase auth domain is required')
    .optional(),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: z
    .string()
    .min(1, 'Firebase storage bucket is required')
    .optional(),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z
    .string()
    .min(1, 'Firebase messaging sender ID is required')
    .optional(),
  EXPO_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase app ID is required').optional(),
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),

  EXPO_PUBLIC_REDIRECT_URI: z.string().min(1, 'Redirect URI is required').optional(),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB: z
    .string()
    .min(1, 'Google web client ID is required')
    .optional(),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: z
    .string()
    .min(1, 'Google iOS client ID is required')
    .optional(),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID: z
    .string()
    .min(1, 'Google Android client ID is required')
    .optional(),
  EXPO_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  EXPO_PUBLIC_APP_BUILD_NUMBER: z.string().default('1'),
  EXPO_PUBLIC_APP_ENVIRONMENT: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  EXPO_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  EXPO_PUBLIC_ENABLE_THROWBACK: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  EXPO_PUBLIC_ENABLE_VARIED_PROMPTS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  EXPO_PUBLIC_DEBUG_MODE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  EXPO_PUBLIC_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Build environment object from available sources
const buildEnvObject = () => {
  const envKeys = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',

    'EXPO_PUBLIC_REDIRECT_URI',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID',
    'EXPO_PUBLIC_APP_VERSION',
    'EXPO_PUBLIC_APP_BUILD_NUMBER',
    'EXPO_PUBLIC_APP_ENVIRONMENT',
    'EXPO_PUBLIC_ENABLE_ANALYTICS',
    'EXPO_PUBLIC_ENABLE_THROWBACK',
    'EXPO_PUBLIC_ENABLE_VARIED_PROMPTS',
    'EXPO_PUBLIC_DEBUG_MODE',
    'EXPO_PUBLIC_LOG_LEVEL',
  ];

  const envObject: Record<string, string | undefined> = {};

  for (const key of envKeys) {
    envObject[key] = getEnvVar(key);
  }

  return envObject;
};

// Validate environment variables - NON-BLOCKING
const validateEnv = () => {
  try {
    const envObject = buildEnvObject();
    return envSchema.parse(envObject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      logger.warn(
        `⚠️ Environment validation failed:\n${missingVars.join('\n')}\n\n` +
          'Some features may not work properly. Check your .env file.'
      );
      // Return the built environment object as fallback
      return buildEnvObject() as Record<string, string | undefined>;
    }
    logger.warn('Environment validation error:', { error: String(error) });
    return buildEnvObject() as Record<string, string | undefined>;
  }
};

// Validated environment variables - with fallback
const env = validateEnv();

// Type-safe configuration object
export const config = {
  supabase: {
    url: env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    authRedirectUrl: env.EXPO_PUBLIC_REDIRECT_URI,
  },
  firebase: {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
  oauth: {
    redirectUri: env.EXPO_PUBLIC_REDIRECT_URI,
    googleClientIds: {
      web: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
      ios: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      android: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    },
  },
  app: {
    version: env.EXPO_PUBLIC_APP_VERSION,
    buildNumber: env.EXPO_PUBLIC_APP_BUILD_NUMBER,
    environment: env.EXPO_PUBLIC_APP_ENVIRONMENT,
  },
  features: {
    analytics: env.EXPO_PUBLIC_ENABLE_ANALYTICS,
    throwback: env.EXPO_PUBLIC_ENABLE_THROWBACK,
    variedPrompts: env.EXPO_PUBLIC_ENABLE_VARIED_PROMPTS,
  },
  debug: {
    enabled: env.EXPO_PUBLIC_DEBUG_MODE || true,
    logLevel: env.EXPO_PUBLIC_LOG_LEVEL || 'debug',
  },
} as const;

// Debug configuration in development
if (__DEV__) {
  logger.debug('🔧 Environment Configuration');
  logger.debug('Environment:', { environment: config.app.environment });
  logger.debug('Supabase URL:', { status: config.supabase.url ? '✅ Set' : '❌ Missing' });
  logger.debug('Firebase Project:', {
    status: config.firebase.projectId ? '✅ Set' : '❌ Missing',
  });
  logger.debug('Analytics Enabled:', { enabled: config.features.analytics });
  logger.debug('Debug Mode:', { enabled: config.debug.enabled });
}
