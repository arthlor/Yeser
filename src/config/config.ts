/**
 * Centralized Configuration Management
 *
 * This module provides type-safe access to environment variables and configuration
 * values across development, staging, and production environments.
 */

interface Config {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'preview' | 'production';
    scheme: string;
    bundleIdentifier: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  auth: {
    redirectUrl: string;
    googleClientId?: string;
  };
  eas: {
    projectId: string;
    updatesUrl: string;
  };
  features: {
    updates: boolean;
    analytics: boolean;
    crashReporting: boolean;
  };
}

// Safe environment variable access
const getEnvVar = (name: string, defaultValue: string = ''): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || defaultValue;
  }
  return defaultValue;
};

// Environment detection
const environment = getEnvVar('EXPO_PUBLIC_ENV', 'development') as
  | 'development'
  | 'preview'
  | 'production';

// Environment-specific configurations
const getAppName = (): string => {
  switch (environment) {
    case 'development':
      return 'Yeşer (Dev)';
    case 'preview':
      return 'Yeşer (Preview)';
    default:
      return 'Yeşer';
  }
};

const getUrlScheme = (): string => {
  switch (environment) {
    case 'development':
      return 'yeser-dev';
    case 'preview':
      return 'yeser-preview';
    default:
      return 'yeser';
  }
};

const getBundleIdentifier = (): string => {
  switch (environment) {
    case 'development':
      return 'com.yeser.dev';
    case 'preview':
      return 'com.yeser.preview';
    default:
      return 'com.yeser';
  }
};

const getRedirectUrl = (): string => {
  const scheme = getUrlScheme();
  return `${scheme}://auth/callback`;
};

// Main configuration object
const config: Config = {
  app: {
    name: getAppName(),
    version: getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
    environment,
    scheme: getUrlScheme(),
    bundleIdentifier: getBundleIdentifier(),
  },
  supabase: {
    url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },
  auth: {
    redirectUrl: getRedirectUrl(),
    googleClientId: getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
  },
  eas: {
    projectId: getEnvVar('EXPO_PUBLIC_EAS_PROJECT_ID', 'your-project-id-here'),
    updatesUrl: `https://u.expo.dev/${getEnvVar('EXPO_PUBLIC_EAS_PROJECT_ID', 'your-project-id-here')}`,
  },
  features: {
    updates: environment === 'production',
    analytics: environment !== 'development',
    crashReporting: environment === 'production',
  },
};

// Validation function
export const validateConfig = (): void => {
  const requiredVars = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

  const missing = requiredVars.filter((varName) => !getEnvVar(varName));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please check your environment configuration for ${environment} environment.`
    );
  }

  // Validate URLs
  try {
    new URL(config.supabase.url);
  } catch {
    throw new Error('Invalid EXPO_PUBLIC_SUPABASE_URL format');
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Configuration validated for ${environment} environment`);
};

// Debug information (only in development)
if (environment === 'development') {
  // eslint-disable-next-line no-console
  console.log('🔧 Configuration loaded:', {
    environment: config.app.environment,
    name: config.app.name,
    scheme: config.app.scheme,
    bundleId: config.app.bundleIdentifier,
    redirectUrl: config.auth.redirectUrl,
    updatesEnabled: config.features.updates,
  });
}

export default config;
