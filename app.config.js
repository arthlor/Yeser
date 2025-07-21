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
    iosClientId: '<PASTE_YOUR_DEVELOPMENT_IOS_CLIENT_ID_HERE>',
    reversedIosClientId: '<PASTE_YOUR_DEVELOPMENT_REVERSED_IOS_CLIENT_ID_HERE>',
  },
  preview: {
    name: 'Yeşer (Preview)',
    appId: makeId('preview'),
    scheme: 'yeser-preview',
    iosClientId: '<PASTE_YOUR_PREVIEW_IOS_CLIENT_ID_HERE>',
    reversedIosClientId: '<PASTE_YOUR_PREVIEW_REVERSED_IOS_CLIENT_ID_HERE>',
  },
  production: {
    name: 'Yeşer',
    appId: makeId(''),
    scheme: 'yeser',
    iosClientId: '<PASTE_YOUR_PRODUCTION_IOS_CLIENT_ID_HERE>',
    reversedIosClientId: '<PASTE_YOUR_PRODUCTION_REVERSED_IOS_CLIENT_ID_HERE>',
  },
};

const { name, appId, scheme, iosClientId, reversedIosClientId } = ENV_MAP[ENV];

console.log(`📦 App Name: ${name}`);
console.log(`📦 Bundle ID: ${appId}`);
console.log(`📦 URL Scheme: ${scheme}`);

/**
 * Anything you put under extra.* is available **at run-time**
 * through `import Constants from 'expo-constants';`
 *             `Constants.expoConfig.extra`
 */
const extra = {
  // Required for EAS project linking - THIS IS CRITICAL
  eas: {
    projectId: '7465061f-a28e-47f5-a4ac-dbbdd4abe243',
  },
  environment: ENV, // always know where we are
  iosClientId, // Pass iOS client ID to runtime
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  /* ALL other EXPO_PUBLIC_* vars are copied blindly so you
     never have to touch this file again when you add one.   */
  ...Object.keys(process.env)
    .filter((k) => k.startsWith('EXPO_PUBLIC_'))
    .reduce((acc, k) => ({ ...acc, [k]: process.env[k] }), {}),
};

module.exports = {
  name,
  slug: 'yeser',
  version: process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0',
  runtimeVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0', // Static version for bare workflow
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
      googleSignIn: {
        reservedClientId: reversedIosClientId,
      },
    },
    infoPlist: {
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
        {
          CFBundleURLSchemes: [reversedIosClientId],
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
    // 🔥 Note: google-services.json is handled via EAS Build environment
    permissions: [
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'com.android.alarm.permission.SET_ALARM',
      'android.permission.WAKE_LOCK',
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      // 🔥 FCM Permissions
      'com.google.android.c2dm.permission.RECEIVE',
      // 🔥 Android 13+ Notification Permission
      'android.permission.POST_NOTIFICATIONS',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme, host: 'auth', pathPrefix: '/callback' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
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
          enableProguardInReleaseBuilds: true,
        },
        ios: {
          deploymentTarget: '15.1',
          useFrameworks: 'static',
          googleServicesFile: process.env.GOOGLE_SERVICES_PLIST,
        },
      },
    ],
    // Enable push notifications
    [
      'expo-notifications',
      {
        icon: './src/assets/assets/adaptive-icon.png',
        color: '#2F4F4F',
        sounds: [],
      },
    ],
    // 🔥 CRITICAL: Custom plugin to handle google-services.json from environment
    './plugins/withGoogleServices.js',
  ],
  extra,
  updates: {
    url: 'https://u.expo.dev/7465061f-a28e-47f5-a4ac-dbbdd4abe243',
  },
  assetBundlePatterns: ['**/*'],
  platforms: ['ios', 'android'],
};
