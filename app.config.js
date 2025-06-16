/* eslint-env node */
/* eslint-disable no-undef */

// Load environment variables safely (EAS-compatible)
const isEASBuild = process.env.EAS_BUILD === 'true' || process.env.CI === 'true';

if (!isEASBuild) {
  // Only try to load dotenv in local development
  try {
    require('dotenv').config();
    console.log('🔧 Loaded environment variables from .env file');
  } catch (error) {
    console.log('🔧 No .env file found or dotenv not available, using process.env directly');
  }
} else {
  console.log('🔧 Running in EAS Build environment');
}

// Secure environment variable access - NO LOGGING OF VALUES
const getEnv = (name, defaultValue = '') => {
  try {
    const value = process.env[name];

    if (value === undefined || value === null || value === '') {
      if (defaultValue) {
        return defaultValue;
      } else {
        return '';
      }
    }
    return value;
  } catch (error) {
    console.error(`❌ Error accessing environment variable ${name}`);
    return defaultValue;
  }
};

// Environment detection with fallback
const environment = getEnv('EXPO_PUBLIC_ENV', 'production');
const IS_DEV = environment === 'development';
const IS_PREVIEW = environment === 'preview';
const IS_PRODUCTION = environment === 'production';

console.log(`🚀 Building for environment: ${environment}`);

// Environment-specific configurations
const getAppName = () => {
  if (IS_DEV) return 'Yeşer (Dev)';
  if (IS_PREVIEW) return 'Yeşer (Preview)';
  return 'Yeşer';
};

const getUrlScheme = () => {
  if (IS_DEV) return 'yeser-dev';
  if (IS_PREVIEW) return 'yeser-preview';
  return 'yeser';
};

const getBundleIdentifier = () => {
  // Use environment-specific bundle IDs
  if (IS_DEV) return 'com.arthlor.yeser.dev';
  if (IS_PREVIEW) return 'com.arthlor.yeser.preview';
  return 'com.arthlor.yeser';
};

// Environment-specific iOS folder names
const getIosTargetName = () => {
  const targetName = IS_DEV ? 'YeerDev' : IS_PREVIEW ? 'YeerPreview' : 'Yeer';
  console.log(`📱 iOS target: ${targetName} (environment: ${environment})`);
  return targetName;
};

// Asset background color - Dark Slate Gray for consistent branding
const ASSET_BACKGROUND_COLOR = '#2F4F4F';

// Secure environment variable helper - no hardcoded production secrets
const getEnvWithDefault = (name, fallback = '') => {
  return getEnv(name, fallback);
};

export default {
  expo: {
    name: getAppName(),
    slug: 'yeser',
    version: '1.0.0',
    orientation: 'portrait',
    icon: 'src/assets/assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: getUrlScheme(),
    platforms: ['ios', 'android'],
    splash: {
      image: 'src/assets/assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: ASSET_BACKGROUND_COLOR,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getBundleIdentifier(),
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSUserTrackingUsageDescription:
          'This allows us to provide personalized gratitude insights and improve your experience.',
        NSCameraUsageDescription:
          'Camera access is needed to add photos to your gratitude entries.',
        NSPhotoLibraryUsageDescription:
          'Photo library access is needed to select photos for your gratitude entries.',
        CFBundleURLTypes: [
          {
            CFBundleURLName: 'yeser-auth-callback',
            CFBundleURLSchemes: [getUrlScheme()],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: 'src/assets/assets/adaptive-icon.png',
        backgroundColor: ASSET_BACKGROUND_COLOR,
      },
      package: getBundleIdentifier(),
      edgeToEdgeEnabled: true,
      // Firebase config will be provided via EAS Build secrets
      permissions: [
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'com.android.alarm.permission.SET_ALARM',
        'android.permission.WAKE_LOCK',
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.NOTIFICATIONS',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: getUrlScheme(),
              host: 'auth',
              pathPrefix: '/callback',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: 'src/assets/assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      [
        '@react-native-firebase/app',
        {
          // Firebase config files will be provided via EAS Build secrets
          // No need to specify file paths when using environment variables
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 34,
            buildToolsVersion: '35.0.0',
          },
          ios: {
            deploymentTarget: '15.1',
            useFrameworks: 'static',
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '7465061f-a28e-47f5-a4ac-dbbdd4abe243',
      },
      environment: environment,
      supabaseUrl: getEnvWithDefault('EXPO_PUBLIC_SUPABASE_URL'),
      supabaseAnonKey: getEnvWithDefault('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
      // Environment variables for app runtime - all from EAS secrets
      env: {
        EXPO_PUBLIC_SUPABASE_URL: getEnvWithDefault('EXPO_PUBLIC_SUPABASE_URL'),
        EXPO_PUBLIC_SUPABASE_ANON_KEY: getEnvWithDefault('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
        EXPO_PUBLIC_FIREBASE_API_KEY: getEnvWithDefault('EXPO_PUBLIC_FIREBASE_API_KEY'),
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: getEnvWithDefault('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: getEnvWithDefault('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
        EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: getEnvWithDefault(
          'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'
        ),
        EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: getEnvWithDefault(
          'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
        ),
        EXPO_PUBLIC_FIREBASE_APP_ID: getEnvWithDefault('EXPO_PUBLIC_FIREBASE_APP_ID'),
        EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: getEnvWithDefault(
          'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
          'G-EJJY3MEQ7L'
        ),
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: getEnvWithDefault('EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS'),
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID: getEnvWithDefault(
          'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID'
        ),
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB: getEnvWithDefault(
          'EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB',
          '384355046895-crbbb1q3vg8n33ukb3kmmhk1dtls6v7l.apps.googleusercontent.com'
        ),
        EXPO_PUBLIC_REDIRECT_URI: getEnvWithDefault('EXPO_PUBLIC_REDIRECT_URI'),
        EXPO_PUBLIC_APP_VERSION: getEnvWithDefault('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
        EXPO_PUBLIC_APP_BUILD_NUMBER: getEnvWithDefault('EXPO_PUBLIC_APP_BUILD_NUMBER', '1'),
        EXPO_PUBLIC_APP_ENVIRONMENT: getEnvWithDefault('EXPO_PUBLIC_APP_ENVIRONMENT', environment),
        EXPO_PUBLIC_ENABLE_ANALYTICS: getEnvWithDefault('EXPO_PUBLIC_ENABLE_ANALYTICS', 'true'),
        EXPO_PUBLIC_ENABLE_THROWBACK: getEnvWithDefault('EXPO_PUBLIC_ENABLE_THROWBACK', 'true'),
      },
    },
    updates: {
      url: 'https://u.expo.dev/7465061f-a28e-47f5-a4ac-dbbdd4abe243',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
};
