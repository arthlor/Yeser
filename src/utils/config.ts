import { z } from 'zod';
import { logger } from '@/utils/debugConfig';

// Environment variable schema for validation
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API key is required'),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase project ID is required'),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase auth domain is required'),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'Firebase storage bucket is required'),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z
    .string()
    .min(1, 'Firebase messaging sender ID is required'),
  EXPO_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase app ID is required'),
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: z.string().min(1, 'Google iOS client ID is required'),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID: z.string().min(1, 'Google Android client ID is required'),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB: z.string().min(1, 'Google web client ID is required'),
  EXPO_PUBLIC_REDIRECT_URI: z.string().url('Invalid redirect URI'),
  EXPO_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  EXPO_PUBLIC_APP_BUILD_NUMBER: z.string().default('1'),
  EXPO_PUBLIC_APP_ENVIRONMENT: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  EXPO_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  EXPO_PUBLIC_ENABLE_CRASHLYTICS: z
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

// Validate environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(
        `❌ Environment validation failed:\n${missingVars.join('\n')}\n\n` +
          'Please check your .env file and ensure all required variables are set.'
      );
    }
    throw error;
  }
};

// Validated environment variables
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
    googleClientIds: {
      ios: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      android: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
      web: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    },
    redirectUri: env.EXPO_PUBLIC_REDIRECT_URI,
  },
  app: {
    version: env.EXPO_PUBLIC_APP_VERSION,
    buildNumber: env.EXPO_PUBLIC_APP_BUILD_NUMBER,
    environment: env.EXPO_PUBLIC_APP_ENVIRONMENT,
  },
  features: {
    analytics: env.EXPO_PUBLIC_ENABLE_ANALYTICS,
    crashlytics: env.EXPO_PUBLIC_ENABLE_CRASHLYTICS,
    throwback: env.EXPO_PUBLIC_ENABLE_THROWBACK,
    variedPrompts: env.EXPO_PUBLIC_ENABLE_VARIED_PROMPTS,
  },
  debug: {
    enabled: env.EXPO_PUBLIC_DEBUG_MODE,
    logLevel: env.EXPO_PUBLIC_LOG_LEVEL,
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
