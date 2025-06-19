/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const dotenvResult = require('dotenv').config({ path: '.env' });
if (dotenvResult.error && process.env.EAS_BUILD !== 'true') {
  // Local dev only – don't crash in CI.
  console.warn("🔧  .env not found (that's OK in CI).");
}

/**
 * Minimal, deterministic build-time config.
 *
 * EXPO_PUBLIC_ENV must be one of: development | preview | production
 * This variable is injected automatically from the chosen EAS
 * build-profile (`env` block in eas.json) or when you run
 * `EXPO_PUBLIC_ENV=preview expo start`.
 */
const ENV = process.env.EXPO_PUBLIC_ENV ?? 'production';

console.log(`🚀 Building for environment: ${ENV}`);

const makeId = (suffix) => `com.arthlor.yeser${suffix ? `.${suffix}` : ''}`;

const ENV_MAP = {
  development: {
    name: 'Yeşer (Dev)',
    appId: makeId('dev'),
    scheme: 'yeser-dev',
  },
  preview: {
    name: 'Yeşer (Preview)',
    appId: makeId('preview'),
    scheme: 'yeser-preview',
  },
  production: {
    name: 'Yeşer',
    appId: makeId(''),
    scheme: 'yeser',
  },
};

const { name, appId, scheme } = ENV_MAP[ENV];

console.log(`📦 App Name: ${name}`);
console.log(`📦 Bundle ID: ${appId}`);
console.log(`📦 URL Scheme: ${scheme}`);

/**
 * Anything you put under extra.* is available **at run-time**
 * through `import Constants from 'expo-constants';`
 *             `Constants.expoConfig.extra`
 */
module.exports = {
  name,
  slug: 'yeser',
  version: process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0',
  runtimeVersion: { policy: 'appVersion' },
  scheme,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: 'src/assets/assets/icon.png',

  splash: {
    image: 'src/assets/assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#2F4F4F',
  },

  ios: {
    bundleIdentifier: appId,
    supportsTablet: true,
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification', 'background-fetch'],
      NSUserTrackingUsageDescription:
        'This allows us to provide personalized gratitude insights and improve your experience.',
      NSCameraUsageDescription: 'Camera access is needed to add photos to your gratitude entries.',
      NSPhotoLibraryUsageDescription:
        'Photo library access is needed to select photos for your gratitude entries.',
      CFBundleURLTypes: [
        {
          CFBundleURLName: 'yeser.auth',
          CFBundleURLSchemes: [scheme],
        },
      ],
    },
  },

  android: {
    package: appId, // ← this is what EAS looks for
    adaptiveIcon: {
      foregroundImage: 'src/assets/assets/adaptive-icon.png',
      backgroundColor: '#2F4F4F',
    },
    edgeToEdgeEnabled: true,
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
        data: [{ scheme, host: 'auth', pathPrefix: '/callback' }],
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
    [
      'expo-notifications',
      {
        icon: 'src/assets/assets/adaptive-icon.png',
        color: '#4F46E5',
        defaultChannel: 'default',
        enableBackgroundRemoteNotifications: true,
        sounds: [],
      },
    ],
  ],

  extra: {
    // Required for EAS project linking - THIS IS CRITICAL
    eas: {
      projectId: '7465061f-a28e-47f5-a4ac-dbbdd4abe243',
    },

    environment: ENV, // always know where we are
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

    /* ALL other EXPO_PUBLIC_* vars are copied blindly so you
       never have to touch this file again when you add one.   */
    ...Object.keys(process.env)
      .filter((k) => k.startsWith('EXPO_PUBLIC_'))
      .reduce((acc, k) => ({ ...acc, [k]: process.env[k] }), {}),
  },

  updates: {
    url: 'https://u.expo.dev/7465061f-a28e-47f5-a4ac-dbbdd4abe243',
  },

  assetBundlePatterns: ['**/*'],
  platforms: ['ios', 'android'],
};
