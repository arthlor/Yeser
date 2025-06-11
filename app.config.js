/* eslint-env node */
/* eslint-disable no-undef */
import 'dotenv/config';

// Safe environment variable access for config
const getEnv = (name, defaultValue = '') => {
  try {
    return process.env[name] || defaultValue;
  } catch {
    return defaultValue;
  }
};

const environment = getEnv('EXPO_PUBLIC_ENV', 'development');
const IS_DEV = environment === 'development';
const IS_PREVIEW = environment === 'preview';
const IS_PRODUCTION = environment === 'production';

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

export default {
  expo: {
    name: getAppName(),
    slug: 'yeser',
    version: '1.0.0',
    orientation: 'portrait',
    icon: 'src/assets/assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: 'src/assets/assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getBundleIdentifier(),
      buildNumber: '1',
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
        backgroundColor: '#ffffff',
      },
      package: getBundleIdentifier(),
      versionCode: 1,
      // Configure edge-to-edge for Android 16+ compatibility
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
          color: '#5DB0A5',
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
          iosUrlScheme: getEnv(
            'EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME',
            'com.googleusercontent.apps.384355046895-d6l39k419j64r0ur9l5jp7qr0dk28o3n'
          ),
        },
      ],
      [
        '@react-native-firebase/app',
        {
          ios: {
            googleServicesFile: 'ios/YeerDev/GoogleService-Info.plist',
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
      supabaseUrl: getEnv('EXPO_PUBLIC_SUPABASE_URL'),
      supabaseAnonKey: getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    },
    updates: {
      url: 'https://u.expo.dev/7465061f-a28e-47f5-a4ac-dbbdd4abe243',
      enabled: IS_PRODUCTION,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: 'sdkVersion',
    },
  },
};
