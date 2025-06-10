# Deployment Guide

This comprehensive guide covers the deployment process for the Yeşer gratitude app, including **production-ready configurations**, **Firebase Analytics setup**, **Supabase production deployment**, **7-layer error protection in production**, and **performance monitoring** strategies.

## 🚀 Production Deployment Overview

The Yeşer app uses a **modern deployment pipeline** with:

- **Expo Application Services (EAS)**: Professional build and deployment platform
- **Firebase Analytics**: Production-ready analytics and crash reporting
- **Supabase Production**: Scalable PostgreSQL backend with RLS security
- **7-Layer Error Protection**: Production error handling and monitoring
- **Performance Monitoring**: Real-time performance tracking and optimization
- **Turkish Localization**: Cultural sensitivity in production error messages
- **Cross-Platform Builds**: Native iOS and Android app generation

```
┌─────────────────────────────────────────────────────────┐
│                  DEPLOYMENT PIPELINE                    │
│                                                         │
│  Development → Staging → Production                     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Local     │  │   Preview   │  │ Production  │     │
│  │    Dev      │  │   Build     │  │   Release   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │               │               │               │
│         ▼               ▼               ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Development │  │   Staging   │  │ Production  │     │
│  │ Environment │  │ Environment │  │ Environment │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Environment Configuration (Production-Ready)

### Production Environment Variables

Create production environment files with secure configurations:

```bash
# .env.production
# Supabase Production Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# Deep Link Configuration
EXPO_PUBLIC_DEEP_LINK_SCHEME=yeser
EXPO_PUBLIC_AUTH_REDIRECT_URL=yeser://auth/callback

# Firebase Analytics (Production)
EXPO_PUBLIC_FIREBASE_PROJECT_ID=yeser-gratitude-prod
EXPO_PUBLIC_FIREBASE_APP_ID_IOS=1:123456789:ios:abcdef
EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID=1:123456789:android:abcdef

# Performance Monitoring
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true

# Error Protection Configuration
EXPO_PUBLIC_ENABLE_ERROR_PROTECTION=true
EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT=https://api.yeser.app/errors
EXPO_PUBLIC_LOG_LEVEL=warn # Reduced logging for production

# App Configuration
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_BUILD_NUMBER=1
EXPO_PUBLIC_ENVIRONMENT=production
```

### EAS Configuration (Enhanced)

```json
// eas.json - Production-ready configuration
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "staging"
      },
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      },
      "android": {
        "buildType": "aab"
      },
      "ios": {
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./android/service-account.json",
        "track": "production"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-asc-app-id",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      }
    }
  }
}
```

## 🔐 Authentication Deployment Setup (Enhanced)

### Supabase Production Configuration

#### 1. Database Security (RLS Policies)

```sql
-- Production-ready RLS policies (already implemented)
-- These policies ensure complete data isolation and security

-- Profiles table policies
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Gratitude entries policies
CREATE POLICY "Users can read own gratitude entries" ON gratitude_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gratitude entries" ON gratitude_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gratitude entries" ON gratitude_entries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gratitude entries" ON gratitude_entries
FOR DELETE USING (auth.uid() = user_id);

-- Additional tables: streaks, daily_prompts, gratitude_benefits
-- All have appropriate RLS policies for production security
```

#### 2. Magic Link Authentication Setup

```javascript
// Supabase Dashboard > Authentication > Settings
{
  "SITE_URL": "https://yeser.app", // Production domain
  "ADDITIONAL_REDIRECT_URLS": [
    "yeser://auth/callback", // Deep link for mobile
    "https://yeser.app/auth/callback" // Web fallback
  ],
  "SMTP_ADMIN_EMAIL": "noreply@yeser.app",
  "SMTP_HOST": "smtp.resend.com", // Production email service
  "SMTP_PORT": "587",
  "SMTP_USER": "resend",
  "SMTP_PASS": "your_production_smtp_password",
  "ENABLE_EMAIL_CONFIRMATIONS": true,
  "EMAIL_CONFIRM_REDIRECT_URL": "yeser://auth/callback"
}
```

#### 3. Email Templates (Turkish Production)

```html
<!-- Magic Link Email Template (Turkish) -->
<h2>Yeşer'e Hoş Geldiniz!</h2>
<p>Merhaba,</p>
<p>Yeşer şükür günlüğünüze güvenli bir şekilde giriş yapmak için aşağıdaki bağlantıya tıklayın:</p>

<a
  href="{{ .ConfirmationURL }}"
  style="background-color: #10B981; color: white; padding: 12px 24px; 
          text-decoration: none; border-radius: 8px; display: inline-block;"
>
  Güvenli Giriş Yap
</a>

<p style="margin-top: 20px; color: #6B7280; font-size: 14px;">
  Bu bağlantı 24 saat boyunca geçerlidir. Eğer bu işlemi siz yapmadıysanız, bu e-postayı güvenle göz
  ardı edebilirsiniz.
</p>

<p style="color: #6B7280; font-size: 12px;">
  Yeşer ekibi<br />
  Şükür dolu günler dileriz 🙏
</p>
```

### Google OAuth Configuration (Production)

```javascript
// Google Cloud Console Configuration
{
  "client_id": "your-production-client-id.apps.googleusercontent.com",
  "redirect_uris": [
    "yeser://auth/callback",
    "https://yeser.app/auth/callback"
  ],
  "javascript_origins": [
    "https://yeser.app"
  ]
}

// Supabase Dashboard > Authentication > Providers > Google
{
  "Client ID": "your-production-client-id.apps.googleusercontent.com",
  "Client Secret": "your-production-client-secret",
  "Redirect URL": "https://your-project.supabase.co/auth/v1/callback"
}
```

## 📱 Firebase Analytics Deployment Setup (Enhanced)

### iOS Configuration (Production)

```xml
<!-- ios/YeserProd/GoogleService-Info.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>CLIENT_ID</key>
  <string>your-ios-client-id.apps.googleusercontent.com</string>
  <key>REVERSED_CLIENT_ID</key>
  <string>com.googleusercontent.apps.your-ios-client-id</string>
  <key>API_KEY</key>
  <string>your-ios-api-key</string>
  <key>GCM_SENDER_ID</key>
  <string>123456789</string>
  <key>PLIST_VERSION</key>
  <string>1</string>
  <key>BUNDLE_ID</key>
  <string>com.yeser.gratitude</string>
  <key>PROJECT_ID</key>
  <string>yeser-gratitude-prod</string>
  <key>STORAGE_BUCKET</key>
  <string>yeser-gratitude-prod.appspot.com</string>
  <key>IS_ADS_ENABLED</key>
  <false></false>
  <key>IS_ANALYTICS_ENABLED</key>
  <true></true> <!-- ENABLED for production -->
  <key>IS_APPINVITE_ENABLED</key>
  <true></true>
  <key>IS_GCM_ENABLED</key>
  <true></true>
  <key>IS_SIGNIN_ENABLED</key>
  <true></true>
  <key>GOOGLE_APP_ID</key>
  <string>1:123456789:ios:abcdef</string>
</dict>
</plist>
```

### Android Configuration (Production)

```json
// android/app/google-services.json
{
  "project_info": {
    "project_number": "123456789",
    "firebase_url": "https://yeser-gratitude-prod.firebaseio.com",
    "project_id": "yeser-gratitude-prod",
    "storage_bucket": "yeser-gratitude-prod.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:123456789:android:abcdef",
        "android_client_info": {
          "package_name": "com.yeser.gratitude"
        }
      },
      "oauth_client": [
        {
          "client_id": "your-android-client-id.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      "api_key": [
        {
          "current_key": "your-android-api-key"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": [
            {
              "client_id": "your-web-client-id.apps.googleusercontent.com",
              "client_type": 3
            }
          ]
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

### Analytics Event Tracking (Production)

```typescript
// src/services/analyticsService.ts - Production configuration
import { getAnalytics, logEvent, setUserProperties } from 'firebase/analytics';
import { app } from '@/config/firebase';
import { logger } from '@/utils/debugConfig';

class AnalyticsService {
  private analytics = getAnalytics(app);
  private isEnabled = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true';

  // Enhanced production event tracking
  trackEvent(eventName: string, parameters?: Record<string, any>) {
    if (!this.isEnabled) return;

    try {
      // Add production context to all events
      const enhancedParameters = {
        ...parameters,
        app_version: process.env.EXPO_PUBLIC_APP_VERSION,
        environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
        timestamp: new Date().toISOString(),
      };

      logEvent(this.analytics, eventName, enhancedParameters);

      logger.debug('Analytics event tracked:', { eventName, parameters: enhancedParameters });
    } catch (error) {
      // Silent failure in production - don't affect user experience
      logger.error('Analytics tracking failed:', error);
    }
  }

  // Production-specific authentication events
  trackAuthenticationEvent(
    type: 'magic_link' | 'google_oauth',
    status: 'success' | 'failure' | 'cancelled',
    errorType?: string
  ) {
    this.trackEvent('authentication_attempt', {
      auth_type: type,
      status,
      error_type: errorType,
      user_cancelled: status === 'cancelled',
    });
  }

  // Enhanced gratitude tracking for production insights
  trackGratitudeEntry(entryData: {
    statementCount: number;
    hasCustomPrompt: boolean;
    useVariedPrompts: boolean;
    streakLength: number;
  }) {
    this.trackEvent('gratitude_entry_created', {
      statement_count: entryData.statementCount,
      has_custom_prompt: entryData.hasCustomPrompt,
      use_varied_prompts: entryData.useVariedPrompts,
      streak_length: entryData.streakLength,
      feature_usage: 'daily_gratitude',
    });
  }

  // Error protection effectiveness tracking
  trackErrorProtection(layer: string, errorType: string, wasProtected: boolean) {
    this.trackEvent('error_protection_applied', {
      protection_layer: layer,
      error_type: errorType,
      was_protected: wasProtected,
      turkish_translation_applied: wasProtected,
    });
  }

  // Performance monitoring for production
  trackPerformanceMetric(metric: string, value: number, context?: Record<string, any>) {
    this.trackEvent('performance_metric', {
      metric_name: metric,
      metric_value: value,
      performance_category: context?.category || 'general',
      ...context,
    });
  }
}

export const analyticsService = new AnalyticsService();
```

## 🚀 Build and Deployment Process

### Production Build Commands

```bash
# 1. Pre-build validation
npm run lint:production          # Enhanced linting for production
npm run test:production          # Full test suite with coverage
npm run type-check:strict        # Strict TypeScript checking
npm run analyze:bundle           # Bundle size analysis

# 2. Production builds
eas build --platform ios --profile production --clear-cache
eas build --platform android --profile production --clear-cache

# 3. Build both platforms simultaneously
eas build --platform all --profile production --clear-cache

# 4. Automated submission (when ready)
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### Enhanced App Configuration (Production)

```javascript
// app.config.js - Production configuration
export default {
  expo: {
    name: 'Yeşer - Şükür Günlüğü',
    slug: 'yeser-gratitude',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './src/assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './src/assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#10B981',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yeser.gratitude',
      buildNumber: '1',
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLName: 'yeser-auth',
            CFBundleURLSchemes: ['yeser'],
          },
        ],
        NSUserTrackingUsageDescription:
          'Bu uygulama, size daha iyi hizmet sunabilmek için anonim kullanım verilerini toplar.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './src/assets/adaptive-icon.png',
        backgroundColor: '#10B981',
      },
      package: 'com.yeser.gratitude',
      versionCode: 1,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'yeser',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      permissions: ['INTERNET', 'ACCESS_NETWORK_STATE', 'VIBRATE'],
    },
    web: {
      favicon: './src/assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      '@react-native-async-storage/async-storage',
      'expo-notifications',
      'expo-haptics',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.your-ios-client-id',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
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

## 🛡️ Production Error Protection & Monitoring

### Enhanced Error Monitoring (Production)

```typescript
// src/utils/productionErrorMonitoring.ts
import { analyticsService } from '@/services/analyticsService';

class ProductionErrorMonitoring {
  private errorCounts = new Map<string, number>();
  private readonly maxErrorCount = 10; // Prevent spam

  initializeProductionMonitoring() {
    if (process.env.EXPO_PUBLIC_ENVIRONMENT !== 'production') return;

    // Global error handler for production
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.handleProductionError('console_error', args);
      originalConsoleError.apply(console, args);
    };

    // Unhandled promise rejection handler
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleProductionError('unhandled_promise_rejection', event.reason);
        event.preventDefault(); // Prevent console spam
      });
    }
  }

  private handleProductionError(type: string, error: any) {
    const errorKey = `${type}_${error?.message || 'unknown'}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;

    if (currentCount < this.maxErrorCount) {
      this.errorCounts.set(errorKey, currentCount + 1);

      // Track error for analytics
      analyticsService.trackEvent('production_error_occurred', {
        error_type: type,
        error_message: error?.message || 'unknown',
        error_count: currentCount + 1,
        stack_trace: error?.stack ? error.stack.substring(0, 500) : undefined,
      });

      // Send to error reporting service
      this.reportToErrorService(type, error);
    }
  }

  private async reportToErrorService(type: string, error: any) {
    if (!process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT) return;

    try {
      await fetch(process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          message: error?.message,
          stack: error?.stack,
          timestamp: new Date().toISOString(),
          appVersion: process.env.EXPO_PUBLIC_APP_VERSION,
          environment: 'production',
        }),
      });
    } catch (reportingError) {
      // Silent failure - don't create error loops
      console.warn('Error reporting failed:', reportingError);
    }
  }
}

export const productionErrorMonitoring = new ProductionErrorMonitoring();
```

## 📋 Pre-Production Checklist

### Deployment Quality Gates

```markdown
## Security Checklist ✅

- [ ] All RLS policies enabled and tested in production
- [ ] Environment variables secured and validated
- [ ] Authentication flows tested with production Supabase
- [ ] Deep link security validated
- [ ] No sensitive data in logs or analytics

## Performance Checklist ✅

- [ ] Bundle size optimized (< 50MB)
- [ ] App startup time < 3 seconds
- [ ] All components render < 16ms
- [ ] Query performance optimized
- [ ] Memory usage within limits

## Error Protection Checklist ✅

- [ ] All 7 layers tested and validated
- [ ] Turkish error messages verified
- [ ] Production error monitoring active
- [ ] No technical errors exposed to users
- [ ] Error recovery flows tested

## Analytics Checklist ✅

- [ ] Firebase Analytics enabled for iOS and Android
- [ ] Production event tracking verified
- [ ] Error protection effectiveness tracking
- [ ] Performance metrics collection
- [ ] User privacy compliance

## Localization Checklist ✅

- [ ] All UI text in Turkish
- [ ] Error messages culturally appropriate
- [ ] Email templates in Turkish
- [ ] App store descriptions in Turkish
- [ ] Privacy policy in Turkish

## Platform-Specific Checklist ✅

- [ ] iOS build with correct provisioning
- [ ] Android build with proper signing
- [ ] Deep links working on both platforms
- [ ] App icons and splash screens
- [ ] Store metadata and screenshots
```

### Production Deployment Commands

```bash
# Final production deployment sequence
./scripts/pre-production-check.sh   # Run all quality gates
eas build --platform all --profile production --clear-cache
./scripts/post-build-validation.sh  # Validate builds
eas submit --platform all --profile production --auto
./scripts/post-deployment-monitoring.sh  # Monitor deployment
```

This comprehensive deployment guide ensures that the Yeşer app is deployed with enterprise-grade security, performance monitoring, error protection, and analytics while maintaining the highest quality standards for production release.
