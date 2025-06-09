# Deployment Guide

This document provides comprehensive deployment strategies and processes for the Yeser gratitude app, covering EAS Build, CI/CD pipelines, and app store deployment.

## 🚀 Deployment Architecture Overview

The Yeser app uses a modern deployment pipeline with:

- **EAS Build**: Expo Application Services for building iOS and Android apps
- **GitHub Actions**: CI/CD pipeline for automated testing and deployment
- **Environment Management**: Separate development, staging, and production environments
- **Automated Testing**: Quality gates before deployment
- **App Store Connect & Google Play Console**: Distribution platforms

```
┌─────────────────────────────────────────────────────────┐
│                    SOURCE CODE                          │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│    │   GitHub    │  │   Feature   │  │    Main     │   │
│    │Repository   │  │  Branches   │  │   Branch    │   │
│    └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                   CI/CD PIPELINE                        │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│    │ GitHub      │  │   Testing   │  │ Build &     │   │
│    │ Actions     │  │   & QA      │  │ Deploy      │   │
│    └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                     EAS BUILD                           │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│    │Development  │  │   Staging   │  │ Production  │   │
│    │   Build     │  │    Build    │  │   Build     │   │
│    └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                  APP DISTRIBUTION                       │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│    │  TestFlight │  │ Google Play │  │ App Store   │   │
│    │(iOS Beta)   │  │ Internal    │  │  Connect    │   │
│    └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Authentication Deployment Setup

### Magic Link Authentication Configuration

Before deploying, ensure proper authentication setup for magic link and OAuth functionality.

#### Supabase Configuration

```bash
# Required environment variables for all environments
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Server-side only

# Deep link configuration (must match app configuration)
# Production: yeser://auth/callback
# Staging: yeser-preview://auth/callback
# Development: yeser-dev://auth/callback
```

#### Deep Link URL Schemes

```javascript
// app.config.js - Environment-specific URL schemes
const getUrlScheme = (env) => {
  switch (env) {
    case 'development':
      return 'yeser-dev';
    case 'staging':
      return 'yeser-preview';
    case 'production':
      return 'yeser';
    default:
      return 'yeser';
  }
};

export default {
  expo: {
    scheme: getUrlScheme(process.env.EXPO_PUBLIC_ENV),
    // ... other config
  },
};
```

#### Supabase Auth Settings (Production Checklist)

1. **Email Templates**: Configure Turkish magic link email template

   ```html
   <!-- Magic Link Email Template -->
   <h2>Yeşer'e Hoş Geldin!</h2>
   <p>Aşağıdaki bağlantıya tıklayarak uygulamaya güvenli şekilde giriş yapabilirsin:</p>
   <a href="{{ .ConfirmationURL }}">Yeşer'e Giriş Yap</a>
   <p>Bu bağlantı 1 saat geçerlidir.</p>
   ```

2. **Site URL Configuration**:

   - Development: `yeser-dev://auth/callback`
   - Staging: `yeser-preview://auth/callback`
   - Production: `yeser://auth/callback`

3. **Additional Redirect URLs**:

   - Add all environment-specific callback URLs
   - Include web URLs if supporting web platform

4. **Rate Limiting**: Configure appropriate limits for magic link sending

   - Production: 5 emails per hour per IP
   - Development: Higher limits for testing

5. **Google OAuth Setup**:
   ```json
   {
     "web": {
       "client_id": "your-google-client-id",
       "redirect_uris": [
         "yeser://auth/callback",
         "https://your-project.supabase.co/auth/v1/callback"
       ]
     }
   }
   ```

### Environment Variable Management

```typescript
// src/config/config.ts - Environment-aware configuration
interface Config {
  supabase: {
    url: string;
    anonKey: string;
  };
  auth: {
    redirectUrl: string;
    googleClientId: string;
  };
  app: {
    environment: 'development' | 'staging' | 'production';
    version: string;
  };
}

const config: Config = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  },
  auth: {
    redirectUrl: (() => {
      switch (process.env.EXPO_PUBLIC_ENV) {
        case 'development':
          return 'yeser-dev://auth/callback';
        case 'staging':
          return 'yeser-preview://auth/callback';
        default:
          return 'yeser://auth/callback';
      }
    })(),
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
  },
  app: {
    environment: (process.env.EXPO_PUBLIC_ENV as any) || 'development',
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  },
};

export default config;
```

## 🔧 EAS Build Configuration

### EAS Configuration File

```json
// eas.json
{
  "$schema": "https://json.schemastore.org/eas.json",
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      },
      "channel": "development",
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "EXPO_PUBLIC_ENV": "staging"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      },
      "autoIncrement": true,
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "../secrets/google-play-service-account.json",
        "track": "internal",
        "changesNotSentForReview": false
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      }
    }
  }
}
```

### Environment-Specific App Configuration

```javascript
// app.config.js
import 'dotenv/config';

const IS_DEV = process.env.EXPO_PUBLIC_ENV === 'development';
const IS_PREVIEW = process.env.EXPO_PUBLIC_ENV === 'staging';

export default {
  expo: {
    name: IS_DEV ? 'Yeser (Dev)' : IS_PREVIEW ? 'Yeser (Preview)' : 'Yeser',
    slug: 'yeser-gratitude-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './src/assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './src/assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? 'com.yeser.gratitude.dev'
        : IS_PREVIEW
          ? 'com.yeser.gratitude.preview'
          : 'com.yeser.gratitude',
      buildNumber: '1',
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSUserTrackingUsageDescription:
          'This allows us to provide personalized gratitude insights.',
        NSCameraUsageDescription:
          'Camera access is needed to add photos to your gratitude entries.',
        NSPhotoLibraryUsageDescription:
          'Photo library access is needed to select photos for your gratitude entries.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './src/assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
      package: IS_DEV
        ? 'com.yeser.gratitude.dev'
        : IS_PREVIEW
          ? 'com.yeser.gratitude.preview'
          : 'com.yeser.gratitude',
      versionCode: 1,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.NOTIFICATIONS',
      ],
    },
    web: {
      favicon: './src/assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './src/assets/notification-icon.png',
          color: '#ffffff',
          sounds: ['./src/assets/sounds/notification.wav'],
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: '34.0.0',
          },
          ios: {
            deploymentTarget: '13.0',
          },
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: IS_DEV
            ? 'com.yeser.gratitude.dev'
            : IS_PREVIEW
              ? 'com.yeser.gratitude.preview'
              : 'com.yeser.gratitude',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'your-eas-project-id',
      },
    },
    updates: {
      url: 'https://u.expo.dev/your-eas-project-id',
    },
    runtimeVersion: {
      policy: 'sdkVersion',
    },
  },
};
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test -- --coverage --watchAll=false

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true

  build-preview:
    name: Build Preview
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Build preview
        run: eas build --platform all --profile preview --non-interactive
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}

  build-production:
    name: Build Production
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Build production
        run: eas build --platform all --profile production --non-interactive
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.PRODUCTION_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PRODUCTION_SUPABASE_ANON_KEY }}

  deploy-production:
    name: Deploy to Stores
    runs-on: ubuntu-latest
    needs: build-production
    if: github.ref == 'refs/heads/main' && contains(github.event.head_commit.message, '[deploy]')
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Submit to App Stores
        run: eas submit --platform all --profile production --non-interactive
```

### GitHub Secrets Configuration

Set up the following secrets in your GitHub repository:

```bash
# Expo and EAS
EXPO_TOKEN=your-expo-access-token

# Supabase - Staging
STAGING_SUPABASE_URL=https://your-staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=your-staging-anon-key

# Supabase - Production
PRODUCTION_SUPABASE_URL=https://your-production-project.supabase.co
PRODUCTION_SUPABASE_ANON_KEY=your-production-anon-key

# Firebase - Production
PRODUCTION_FIREBASE_API_KEY=your-firebase-api-key
PRODUCTION_FIREBASE_PROJECT_ID=your-firebase-project-id

# App Store Connect
APPLE_ID=your-apple-id@example.com
APPLE_TEAM_ID=ABCD123456
ASC_APP_ID=1234567890

# Google Play Console
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-json
```

## 📱 Platform-Specific Deployment

### iOS Deployment

#### App Store Connect Setup

1. **Create App Record**

   ```bash
   # App Store Connect Console
   - Bundle ID: com.yeser.gratitude
   - App Name: Yeser - Gratitude Journal
   - Primary Language: English
   - SKU: yeser-gratitude-001
   ```

2. **Configure App Information**

   ```bash
   # Required Information
   - Privacy Policy URL
   - App Category: Health & Fitness
   - Content Rating: 4+
   - App Description (4000 characters max)
   - Keywords (100 characters max)
   - Screenshots (all required sizes)
   ```

3. **Build and Submit**

   ```bash
   # Build for App Store
   eas build --platform ios --profile production

   # Submit to App Store Connect
   eas submit --platform ios --profile production

   # Or manual upload via Xcode
   # 1. Download .ipa file from EAS
   # 2. Use Transporter app or Xcode Organizer
   ```

#### TestFlight Beta Testing

```bash
# Build for TestFlight
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios --profile preview

# Manage beta testers in App Store Connect
# - Internal Testing: App Store Connect users
# - External Testing: Up to 10,000 external testers
```

### Android Deployment

#### Google Play Console Setup

1. **Create App**

   ```bash
   # Google Play Console
   - App Name: Yeser - Gratitude Journal
   - Default Language: English
   - App Category: Health & Fitness
   - Content Rating: Everyone
   ```

2. **Configure Store Listing**

   ```bash
   # Required Assets
   - App Icon (512x512 PNG)
   - Feature Graphic (1024x500 PNG)
   - Screenshots (Phone, 7-inch Tablet, 10-inch Tablet)
   - Short Description (80 characters)
   - Full Description (4000 characters)
   ```

3. **Build and Submit**

   ```bash
   # Build for Play Store (AAB format)
   eas build --platform android --profile production

   # Submit to Google Play Console
   eas submit --platform android --profile production

   # Or manual upload
   # 1. Download .aab file from EAS
   # 2. Upload via Google Play Console
   ```

#### Internal Testing

```bash
# Build for internal testing
eas build --platform android --profile preview

# Upload to internal testing track
eas submit --platform android --profile preview

# Share with internal testers via email list
```

## 🌐 Environment Management

### Environment Variables

```typescript
// src/config/environment.ts
interface Environment {
  production: boolean;
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

const development: Environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  firebaseConfig: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  },
};

const staging: Environment = {
  production: false,
  apiUrl: 'https://staging-api.yeser.app',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  firebaseConfig: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  },
};

const production: Environment = {
  production: true,
  apiUrl: 'https://api.yeser.app',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  firebaseConfig: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  },
};

const getEnvironment = (): Environment => {
  const env = process.env.EXPO_PUBLIC_ENV || 'development';

  switch (env) {
    case 'staging':
      return staging;
    case 'production':
      return production;
    default:
      return development;
  }
};

export const environment = getEnvironment();
```

### Environment-Specific Configuration

```bash
# .env.development
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=yeser-dev

# .env.staging
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=yeser-staging

# .env.production
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=yeser-prod
```

## 📊 Monitoring and Analytics

### Build Monitoring

```typescript
// src/utils/buildInfo.ts
import Constants from 'expo-constants';

export const buildInfo = {
  version: Constants.expoConfig?.version || 'unknown',
  buildNumber:
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode ||
    'unknown',
  environment: process.env.EXPO_PUBLIC_ENV || 'development',
  buildDate: new Date().toISOString(),
  easBuildId: Constants.expoConfig?.extra?.eas?.projectId || 'local',
};

// Log build info on app start
console.log('App Build Info:', buildInfo);
```

### Crash Reporting

```typescript
// src/services/crashReporting.ts
import * as Sentry from '@sentry/react-native';
import { environment } from '@/config/environment';

// Initialize Sentry in production only
if (environment.production) {
  Sentry.init({
    dsn: 'your-sentry-dsn',
    environment: process.env.EXPO_PUBLIC_ENV,
    enableAutoSessionTracking: true,
    tracesSampleRate: 1.0,
  });
}

export const crashReporting = {
  captureException: (error: Error, context?: any) => {
    if (environment.production) {
      Sentry.captureException(error, { extra: context });
    } else {
      console.error('Exception captured:', error, context);
    }
  },

  captureMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
    if (environment.production) {
      Sentry.captureMessage(message, level);
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  },

  setUser: (user: { id: string; email?: string }) => {
    if (environment.production) {
      Sentry.setUser(user);
    }
  },
};
```

## 🔄 Over-the-Air Updates

### Expo Updates Configuration

```javascript
// expo-updates configuration in app.config.js
export default {
  expo: {
    // ... other config
    updates: {
      url: 'https://u.expo.dev/your-eas-project-id',
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: 'sdkVersion',
    },
  },
};
```

### Update Management

```typescript
// src/services/updateService.ts
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export const updateService = {
  checkForUpdates: async () => {
    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new version of the app is available. Would you like to download it?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  },

  forceUpdate: async () => {
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.error('Error forcing update:', error);
    }
  },
};
```

## 📋 Deployment Checklist

### Pre-Deployment Checklist

#### Code Quality

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage meets thresholds (>80%)
- [ ] ESLint and TypeScript checks pass
- [ ] Performance tests completed
- [ ] Security scan completed

#### Environment Preparation

- [ ] Environment variables configured for target environment
- [ ] Database migrations completed (if any)
- [ ] Backend services deployed and healthy
- [ ] CDN and asset optimization completed

#### App Configuration

- [ ] Version number incremented
- [ ] Build number incremented (iOS)
- [ ] Version code incremented (Android)
- [ ] App icons and splash screens updated
- [ ] Store listing assets prepared

#### Platform Preparation

- [ ] iOS certificates and provisioning profiles valid
- [ ] Android keystore available and valid
- [ ] App Store Connect app record configured
- [ ] Google Play Console app configured

### Post-Deployment Checklist

#### Verification

- [ ] App successfully builds on EAS
- [ ] App installs correctly on test devices
- [ ] Critical user flows tested
- [ ] Push notifications working
- [ ] Analytics tracking functional
- [ ] Crash reporting configured

#### Store Submission

- [ ] App submitted to App Store Connect
- [ ] App submitted to Google Play Console
- [ ] Beta testing groups configured
- [ ] Store listing information complete
- [ ] Screenshots and metadata accurate

#### Monitoring

- [ ] Error tracking alerts configured
- [ ] Performance monitoring active
- [ ] User feedback collection enabled
- [ ] Update mechanism tested
- [ ] Rollback plan documented

## 🚨 Emergency Procedures

### Rollback Strategy

```bash
# Emergency rollback process

# 1. Identify problematic build
eas build:list --platform all --status=finished --limit=10

# 2. Revert to previous version in stores
# iOS: Use App Store Connect to rollback release
# Android: Use Google Play Console to rollback release

# 3. Deploy hotfix OTA update if needed
eas update --branch production --message "Emergency hotfix"

# 4. Notify users via in-app notification or push notification
```

### Incident Response

1. **Immediate Response (0-15 minutes)**

   - Identify the scope and impact
   - Stop ongoing deployments
   - Assess if rollback is needed

2. **Short-term Response (15-60 minutes)**

   - Implement rollback if necessary
   - Deploy emergency fixes
   - Monitor error rates and user reports

3. **Resolution (1-24 hours)**

   - Identify root cause
   - Implement comprehensive fix
   - Test thoroughly before re-deployment
   - Update monitoring and alerting

4. **Post-Incident (24-48 hours)**
   - Conduct post-mortem analysis
   - Update deployment procedures
   - Improve monitoring and testing
   - Communicate lessons learned

## 📈 Performance Optimization

### Build Optimization

```javascript
// metro.config.js - Optimize bundle size
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking
config.resolver.unstable_enablePackageExports = true;

// Optimize assets
config.transformer.minifierConfig = {
  ecma: 8,
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
```

### Asset Optimization

```bash
# Image optimization script
#!/bin/bash

# Optimize PNG images
find ./src/assets -name "*.png" -exec pngquant --quality=65-90 --ext .png --force {} \;

# Optimize JPEG images
find ./src/assets -name "*.jpg" -exec jpegoptim --max=85 --preserve --force {} \;

# Generate WebP versions
find ./src/assets -name "*.png" -o -name "*.jpg" | while read img; do
  cwebp "$img" -o "${img%.*}.webp" -q 85
done
```

## 🔮 Advanced Deployment Features

### Feature Flags

```typescript
// src/services/featureFlags.ts
import { environment } from '@/config/environment';

interface FeatureFlags {
  newOnboarding: boolean;
  enhancedNotifications: boolean;
  premiumFeatures: boolean;
  analyticsV2: boolean;
}

const getFeatureFlags = (): FeatureFlags => {
  if (environment.production) {
    return {
      newOnboarding: true,
      enhancedNotifications: true,
      premiumFeatures: false,
      analyticsV2: false,
    };
  }

  // Development/staging flags
  return {
    newOnboarding: true,
    enhancedNotifications: true,
    premiumFeatures: true,
    analyticsV2: true,
  };
};

export const featureFlags = getFeatureFlags();
```

### A/B Testing Integration

```typescript
// src/services/abTesting.ts
import { environment } from '@/config/environment';

export const abTesting = {
  getVariant: (testName: string, userId: string): string => {
    if (!environment.production) {
      return 'control'; // Default for development
    }

    // Simple hash-based assignment
    const hash = hashString(`${testName}_${userId}`);
    return hash % 2 === 0 ? 'control' : 'variant';
  },

  trackEvent: (event: string, properties: Record<string, any>) => {
    // Track A/B test events
    console.log('A/B Test Event:', event, properties);
  },
};

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};
```

---

This deployment guide provides a comprehensive foundation for deploying the Yeser gratitude app across all platforms with automated CI/CD, proper environment management, and robust monitoring and rollback capabilities.
