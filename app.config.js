/* eslint-env node */
/* eslint-disable no-undef */

// Load environment variables safely (EAS-compatible)
// Note: EAS environment variables are NOT available during app.config.js evaluation
// They become available during the actual build process
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
  console.log('📝 Note: EAS environment variables are not available during config evaluation');
  console.log('📝 They will be available during the build process itself');
  // Debug: List all EXPO_PUBLIC_ environment variables
  const expoPublicVars = Object.keys(process.env).filter((key) => key.startsWith('EXPO_PUBLIC_'));
  console.log(`🔍 Available EXPO_PUBLIC_ vars during config: ${expoPublicVars.join(', ')}`);
}

// Enhanced environment variable access with EAS Build support
const getEnv = (name, defaultValue = '') => {
  try {
    const value = process.env[name];
    // Safe logging - show first 10 chars for debugging without exposing secrets
    const valuePreview = value ? `${value.substring(0, 10)}...` : 'undefined/null/empty';
    console.log(`🔍 Checking env var ${name}: ${valuePreview}`);

    if (value === undefined || value === null || value === '') {
      if (defaultValue) {
        console.log(`🔧 Using default value for ${name}: ${defaultValue.substring(0, 20)}...`);
        return defaultValue;
      } else {
        console.log(`⚠️ Environment variable ${name} is not set, using empty string`);
        return '';
      }
    }
    console.log(`✅ Using environment value for ${name}: ${value.substring(0, 10)}...`);
    return value;
  } catch (error) {
    console.error(`❌ Error accessing environment variable ${name}:`, error);
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

// Environment-specific iOS folder names with validation
const getIosTargetName = () => {
  const targetName = IS_DEV ? 'YeerDev' : IS_PREVIEW ? 'YeerPreview' : 'Yeer';
  console.log(`📱 iOS target: ${targetName} (environment: ${environment})`);
  return targetName;
};

// Asset background color - Dark Slate Gray for consistent branding
const ASSET_BACKGROUND_COLOR = '#2F4F4F';

// Production values for EAS builds (since EAS env vars aren't available during config evaluation)
const PRODUCTION_VALUES = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://svnexpdbckqiexdjbaca.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2bmV4cGRiY2txaWV4ZGpiYWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDYxNTgsImV4cCI6MjA2NDI4MjE1OH0.tlO7pmgyjmM3CGEYwbz5IleMIMqN7FWTTARxWerRzmE',
  EXPO_PUBLIC_FIREBASE_API_KEY: 'AIzaSyAfVMLrX2Fu3QGEBW0epmufdRkqkC2WSnM',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'yeser-2b816',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'yeser-2b816.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'yeser-2b816.firebasestorage.app',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '747763611639',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:747763611639:ios:8345c9073f3d3e19e460f2',
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS:
    '384355046895-d6l39k419j64r0ur9l5jp7qr0dk28o3n.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID:
    '384355046895-un55q9co2thln0a1dv2m50votb7i08d3.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME:
    'com.googleusercontent.apps.384355046895-d6l39k419j64r0ur9l5jp7qr0dk28o3n',
  EXPO_PUBLIC_REDIRECT_URI: 'yeser://auth/callback',
};

// Default/fallback values for development
const DEFAULT_VALUES = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-key',
  EXPO_PUBLIC_FIREBASE_API_KEY: 'placeholder-api-key',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'yeser-2b816',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'yeser-2b816.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'yeser-2b816.firebasestorage.app',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '747763611639',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:747763611639:ios:8345c9073f3d3e19e460f2',
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS:
    '384355046895-d6l39k419j64r0ur9l5jp7qr0dk28o3n.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID:
    '384355046895-un55q9co2thln0a1dv2m50votb7i08d3.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME:
    'com.googleusercontent.apps.384355046895-d6l39k419j64r0ur9l5jp7qr0dk28o3n',
  EXPO_PUBLIC_REDIRECT_URI: 'yeser://auth/callback',
};

// Helper to get environment variable with sensible defaults
const getEnvWithDefault = (name) => {
  // For EAS builds, use production values since EAS env vars aren't available during config evaluation
  if (isEASBuild && IS_PRODUCTION && PRODUCTION_VALUES[name]) {
    console.log(`🏭 Using production value for ${name} (EAS Build)`);
    return PRODUCTION_VALUES[name];
  }
  return getEnv(name, DEFAULT_VALUES[name] || '');
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
      googleServicesFile: 'android/app/google-services.json',
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
        'expo-notifications',
        {
          icon: 'src/assets/assets/notification-icon.png',
          color: ASSET_BACKGROUND_COLOR,
          defaultChannel: 'yeser-reminders',
          sounds: ['src/assets/assets/sounds/notification_sound.wav'],
          androidMode: 'default',
          androidCollapsedTitle: getAppName(),
          iosDisplayInForeground: true,
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: getEnvWithDefault('EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME'),
        },
      ],
      [
        '@react-native-firebase/app',
        {
          ios: {
            googleServicesFile: `ios/${getIosTargetName()}/GoogleService-Info.plist`,
          },
          android: {
            googleServicesFile: 'android/app/google-services.json',
          },
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
      // Inject environment variables into the app bundle with defaults
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
        EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: getEnv(
          'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
          'G-EJJY3MEQ7L'
        ),
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: getEnvWithDefault('EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS'),
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID: getEnvWithDefault(
          'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID'
        ),
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB: getEnv(
          'EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB',
          '384355046895-crbbb1q3vg8n33ukb3kmmhk1dtls6v7l.apps.googleusercontent.com'
        ),
        EXPO_PUBLIC_REDIRECT_URI: getEnvWithDefault('EXPO_PUBLIC_REDIRECT_URI'),
        EXPO_PUBLIC_APP_VERSION: getEnv('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
        EXPO_PUBLIC_APP_BUILD_NUMBER: getEnv('EXPO_PUBLIC_APP_BUILD_NUMBER', '1'),
        EXPO_PUBLIC_APP_ENVIRONMENT: getEnv('EXPO_PUBLIC_APP_ENVIRONMENT', environment),
        EXPO_PUBLIC_ENABLE_ANALYTICS: getEnv('EXPO_PUBLIC_ENABLE_ANALYTICS', 'true'),
        EXPO_PUBLIC_ENABLE_THROWBACK: getEnv('EXPO_PUBLIC_ENABLE_THROWBACK', 'true'),
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
