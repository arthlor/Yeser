# Deployment Guide

This document provides comprehensive guidance for building, deploying, and releasing the Yeser gratitude app across different environments and platforms.

## 🚀 Deployment Overview

The Yeser app follows a multi-environment deployment strategy with automated CI/CD pipelines for consistent and reliable releases.

### Deployment Environments

```
Development → Staging → Production
     ↓           ↓          ↓
   Dev Builds  Preview    App Store
   TestFlight  Builds     Google Play
```

### Platform Support

| Platform | Deployment Method | Distribution |
|----------|-------------------|--------------|
| **iOS** | Expo Application Services (EAS) | App Store, TestFlight |
| **Android** | EAS Build + Google Play Console | Google Play Store, Internal Testing |
| **Web** | Vercel/Netlify | PWA Distribution |

## 🏗️ Build Configuration

### EAS Build Configuration

```json
// eas.json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_APP_ENVIRONMENT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "EXPO_PUBLIC_APP_ENVIRONMENT": "staging"
      }
    },
    "production": {
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_APP_ENVIRONMENT": "production"
      }
    },
    "production-ios": {
      "extends": "production",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "production-android": {
      "extends": "production",
      "android": {
        "resourceClass": "medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-asc-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "../path/to/api-key.json",
        "track": "internal"
      }
    }
  }
}
```

### App Configuration

```json
// app.json
{
  "expo": {
    "name": "Yeser",
    "slug": "yeser-gratitude",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yeser.gratitude",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "This app does not use the camera.",
        "NSMicrophoneUsageDescription": "This app does not use the microphone.",
        "NSLocationWhenInUseUsageDescription": "This app does not use location.",
        "CFBundleURLTypes": [
          {
            "CFBundleURLName": "yeser",
            "CFBundleURLSchemes": ["yeser"]
          }
        ]
      },
      "googleServicesFile": "./ios/GoogleService-Info.plist"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.yeser.gratitude",
      "versionCode": 1,
      "permissions": [
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.USE_EXACT_ALARM"
      ],
      "googleServicesFile": "./android/app/google-services.json",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "yeser.app"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-localization",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "default"
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "13.0"
          },
          "android": {
            "compileSdkVersion": 34,
            "targetSdkVersion": 34,
            "minSdkVersion": 21
          }
        }
      ]
    ],
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "your-eas-project-id"
      }
    },
    "updates": {
      "url": "https://u.expo.dev/your-eas-project-id"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

## 🔧 Build Scripts and Automation

### Package.json Scripts

```json
{
  "scripts": {
    "start": "expo start",
    "reset": "expo start --clear",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    
    "build:development": "eas build --profile development --platform all",
    "build:preview": "eas build --profile preview --platform all",
    "build:production": "eas build --profile production --platform all",
    "build:ios": "eas build --profile production-ios --platform ios",
    "build:android": "eas build --profile production-android --platform android",
    
    "submit:ios": "eas submit --platform ios",
    "submit:android": "eas submit --platform android",
    "submit:all": "eas submit --platform all",
    
    "update:preview": "eas update --branch preview --message",
    "update:production": "eas update --branch production --message",
    
    "prebuild": "npx expo prebuild",
    "prebuild:clean": "npx expo prebuild --clean"
  }
}
```

### Environment-Specific Builds

#### Development Builds

```bash
# Build development client for testing
eas build --profile development --platform ios
eas build --profile development --platform android

# Install development build on device
npx expo install --dev-client
```

#### Preview Builds

```bash
# Build preview for internal testing
eas build --profile preview --platform all

# Update preview build
eas update --branch preview --message "Feature X testing"
```

#### Production Builds

```bash
# Build production ready apps
eas build --profile production --platform all

# Build platform-specific production
eas build --profile production-ios --platform ios
eas build --profile production-android --platform android
```

## 🎯 Release Strategy

### Version Management

#### Semantic Versioning

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └─ Bug fixes
  │     └─ New features (backward compatible)
  └─ Breaking changes
```

Examples:
- `1.0.0` - Initial release
- `1.1.0` - New features added
- `1.1.1` - Bug fixes
- `2.0.0` - Breaking changes

#### Version Bump Script

```javascript
// scripts/bump-version.js
const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.join(__dirname, '../package.json');
const APP_JSON = path.join(__dirname, '../app.json');

function bumpVersion(type = 'patch') {
  // Read current versions
  const package = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  
  const [major, minor, patch] = package.version.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      throw new Error('Invalid version type');
  }
  
  // Update package.json
  package.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON, JSON.stringify(package, null, 2));
  
  // Update app.json
  app.expo.version = newVersion;
  app.expo.ios.buildNumber = String(parseInt(app.expo.ios.buildNumber) + 1);
  app.expo.android.versionCode = app.expo.android.versionCode + 1;
  fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2));
  
  console.log(`✅ Version bumped to ${newVersion}`);
  console.log(`📱 iOS build number: ${app.expo.ios.buildNumber}`);
  console.log(`🤖 Android version code: ${app.expo.android.versionCode}`);
}

const type = process.argv[2] || 'patch';
bumpVersion(type);
```

### Release Workflow

#### 1. Pre-Release Checklist

```markdown
- [ ] All tests passing
- [ ] Code review completed
- [ ] Version bumped appropriately
- [ ] Changelog updated
- [ ] Environment variables verified
- [ ] Assets optimized
- [ ] Performance tested
- [ ] Security review completed
```

#### 2. Build Process

```bash
# 1. Update version
npm run version:bump patch

# 2. Run quality checks
npm run lint
npm run type-check
npm run test

# 3. Build production apps
npm run build:production

# 4. Submit to stores (after testing)
npm run submit:all
```

#### 3. Release Notes Template

```markdown
## [1.1.0] - 2024-01-15

### 🎉 New Features
- Added dark theme support
- Implemented data export functionality
- New throwback memory feature

### 🐛 Bug Fixes
- Fixed streak calculation edge case
- Resolved notification scheduling issue
- Improved offline sync reliability

### 🔧 Improvements
- Enhanced performance on older devices
- Updated UI animations
- Improved accessibility

### 📚 Technical
- Upgraded React Native to 0.73
- Updated Supabase SDK
- Enhanced error handling
```

## 🏪 App Store Deployment

### iOS App Store

#### App Store Connect Setup

1. **App Information**
   ```
   Name: Yeser - Gratitude Journal
   Bundle ID: com.yeser.gratitude
   SKU: yeser-gratitude-001
   Category: Health & Fitness
   ```

2. **App Privacy**
   ```
   Data Collection: Contact Info, Health & Fitness, Usage Data
   Data Linking: Only analytics data
   Data Tracking: None
   ```

3. **App Review Information**
   ```
   Demo Account: Not required (no login needed for basic features)
   Notes: Focus on gratitude journaling and personal wellness
   ```

#### TestFlight Distribution

```bash
# Build and submit to TestFlight
eas build --profile production-ios --platform ios
eas submit --platform ios --latest

# Add external testers via App Store Connect
# Internal testers get automatic access
```

#### Production Release

```yaml
# .github/workflows/ios-release.yml
name: iOS Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-submit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build iOS app
        run: eas build --profile production-ios --platform ios --non-interactive
      
      - name: Submit to App Store
        run: eas submit --platform ios --latest --non-interactive
```

### Android Google Play

#### Google Play Console Setup

1. **App Details**
   ```
   App Name: Yeser - Gratitude Journal
   Package Name: com.yeser.gratitude
   Category: Health & Fitness
   ```

2. **Content Rating**
   ```
   Target Audience: Everyone
   Content: No sensitive content
   Ads: None
   ```

3. **Data Safety**
   ```
   Data Collection: Personal info for account creation
   Data Sharing: None with third parties
   Security: Data encrypted in transit and at rest
   ```

#### Internal Testing

```bash
# Build and submit to internal testing
eas build --profile production-android --platform android
eas submit --platform android --track internal --latest
```

#### Production Release

```yaml
# .github/workflows/android-release.yml
name: Android Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-submit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Build Android app
        run: eas build --profile production-android --platform android --non-interactive
      
      - name: Submit to Google Play
        run: eas submit --platform android --track production --latest --non-interactive
        env:
          GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}
```

## 🌐 Web Deployment

### Vercel Deployment

```json
// vercel.json
{
  "buildCommand": "expo export -p web",
  "outputDirectory": "dist",
  "devCommand": "expo start --web",
  "framework": "expo",
  "env": {
    "EXPO_PUBLIC_APP_ENVIRONMENT": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### GitHub Actions Web Deployment

```yaml
# .github/workflows/web-deploy.yml
name: Deploy Web App

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web app
        run: npx expo export -p web
        env:
          EXPO_PUBLIC_APP_ENVIRONMENT: production
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 🔄 Over-the-Air Updates

### EAS Updates Configuration

```javascript
// eas-updates.js
module.exports = {
  branches: {
    production: {
      channel: 'production',
      runtime: 'native'
    },
    preview: {
      channel: 'preview',
      runtime: 'native'
    }
  },
  updates: {
    production: {
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 5000
    },
    preview: {
      enabled: true,
      checkAutomatically: 'ON_ERROR_RECOVERY',
      fallbackToCacheTimeout: 2000
    }
  }
};
```

### Update Deployment

```bash
# Deploy JavaScript-only updates
eas update --branch production --message "Bug fixes and improvements"
eas update --branch preview --message "Feature testing"

# Rollback updates if needed
eas update --branch production --republish --message "Rollback to previous version"
```

### Update Integration

```typescript
// src/services/updateService.ts
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export const checkForUpdates = async (): Promise<void> => {
  if (__DEV__) return;

  try {
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      
      Alert.alert(
        'Update Available',
        'A new version is available. Restart the app to apply updates.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => Updates.reloadAsync() }
        ]
      );
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
};

export const getUpdateInfo = async () => {
  const isUpdateAvailable = await Updates.checkForUpdateAsync();
  const manifest = Updates.manifest;
  
  return {
    isUpdateAvailable: isUpdateAvailable.isAvailable,
    currentVersion: manifest?.version || 'Unknown',
    updateId: manifest?.id || 'Unknown',
    channel: Updates.channel || 'Unknown'
  };
};
```

## 🚦 CI/CD Pipeline

### Complete GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main, develop]

env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build-preview:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build preview
        run: eas build --profile preview --platform all --non-interactive

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build production
        run: eas build --profile production --platform all --non-interactive
      
      - name: Submit to stores
        run: eas submit --platform all --latest --non-interactive
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web
        run: npx expo export -p web
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## 🔒 Security and Secrets Management

### Required Secrets

#### GitHub Secrets

```bash
# Expo
EXPO_TOKEN=your-expo-access-token

# Apple
APPLE_ID=your-apple-id@email.com
APPLE_PASSWORD=app-specific-password
ASC_APP_ID=your-app-store-connect-app-id

# Google
GOOGLE_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-key

# Vercel
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id

# Supabase (if needed for builds)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Environment-Specific Variables

```bash
# Development
EXPO_PUBLIC_SUPABASE_URL_DEV=https://dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY_DEV=dev-anon-key

# Staging
EXPO_PUBLIC_SUPABASE_URL_STAGING=https://staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING=staging-anon-key

# Production
EXPO_PUBLIC_SUPABASE_URL_PROD=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD=prod-anon-key
```

### Security Best Practices

1. **Secret Rotation**: Regularly rotate API keys and tokens
2. **Least Privilege**: Grant minimum necessary permissions
3. **Audit Logs**: Monitor access to sensitive operations
4. **Environment Isolation**: Separate secrets by environment
5. **Backup Secrets**: Securely store backup copies

## 📊 Monitoring and Analytics

### Build Monitoring

```typescript
// scripts/build-monitor.js
const { exec } = require('child_process');
const axios = require('axios');

async function monitorBuild(buildId) {
  const checkStatus = async () => {
    try {
      const result = await exec(`eas build:view ${buildId} --json`);
      const build = JSON.parse(result.stdout);
      
      console.log(`Build ${buildId}: ${build.status}`);
      
      if (build.status === 'finished') {
        await notifySuccess(build);
      } else if (build.status === 'errored') {
        await notifyError(build);
      } else {
        setTimeout(checkStatus, 30000); // Check again in 30s
      }
    } catch (error) {
      console.error('Failed to check build status:', error);
    }
  };
  
  checkStatus();
}

async function notifySuccess(build) {
  // Send success notification to Slack/Discord
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `✅ Build ${build.id} completed successfully!`
  });
}

async function notifyError(build) {
  // Send error notification
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `❌ Build ${build.id} failed: ${build.error?.message || 'Unknown error'}`
  });
}
```

### Deployment Analytics

```typescript
// src/utils/deploymentAnalytics.ts
import { analyticsService } from '@/services/analyticsService';

export const trackDeployment = async (version: string, platform: string) => {
  await analyticsService.logEvent('app_deployment', {
    version,
    platform,
    timestamp: new Date().toISOString(),
    environment: process.env.EXPO_PUBLIC_APP_ENVIRONMENT
  });
};

export const trackUpdate = async (updateId: string, channel: string) => {
  await analyticsService.logEvent('app_update', {
    updateId,
    channel,
    timestamp: new Date().toISOString()
  });
};
```

## 🐛 Troubleshooting Deployment Issues

### Common Build Errors

#### 1. Certificate Issues (iOS)

```bash
# Clear certificates and regenerate
eas credentials --platform ios --clear-all
eas build --profile production-ios --platform ios --clear-cache
```

#### 2. Android Keystore Issues

```bash
# Generate new keystore
eas credentials --platform android
# Follow prompts to generate new keystore
```

#### 3. Expo Updates Conflicts

```bash
# Clear update cache
eas update --branch production --clear
eas build --profile production --platform all --clear-cache
```

#### 4. Out of Memory Errors

```json
// eas.json - Increase resource class
{
  "build": {
    "production-ios": {
      "ios": {
        "resourceClass": "m1-large"  // Upgrade from m1-medium
      }
    }
  }
}
```

### Debug Build Issues

```bash
# Enable verbose logging
eas build --profile production --platform ios --non-interactive --verbose

# Check build logs
eas build:view [build-id]

# Download build artifacts
eas build:download [build-id]
```

### Store Submission Issues

#### App Store Rejection Checklist

- [ ] App follows Apple Human Interface Guidelines
- [ ] No placeholder content or test data
- [ ] All features work as described
- [ ] Privacy policy accessible if collecting data
- [ ] Age rating matches content
- [ ] Screenshots show actual app functionality

#### Google Play Rejection Checklist

- [ ] App complies with Google Play policies
- [ ] Target SDK version meets requirements
- [ ] Data safety form completed accurately
- [ ] Content rating matches app content
- [ ] App signing configured correctly

---

This comprehensive deployment guide provides all the necessary information for successfully building, testing, and releasing the Yeser gratitude app across multiple platforms and environments. 