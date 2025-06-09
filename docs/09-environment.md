# Environment Configuration

This document provides comprehensive documentation for all environment variables, configuration files, and setup requirements for the Yeser gratitude app.

## 🔧 Environment Variables

### Required Environment Variables

All environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the client app.

#### Supabase Configuration (Magic Link Authentication)

```bash
# Supabase Project Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Magic Link Authentication Configuration
EXPO_PUBLIC_AUTH_REDIRECT_URL=yeser://auth/callback
EXPO_PUBLIC_AUTH_REDIRECT_URL_DEV=yeser-dev://auth/callback
EXPO_PUBLIC_AUTH_REDIRECT_URL_PREVIEW=yeser-preview://auth/callback

# Optional: Custom Supabase configuration
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only
```

**Description:**
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous/public key for client access
- `EXPO_PUBLIC_AUTH_REDIRECT_URL`: Deep link URL for magic link authentication
- `EXPO_PUBLIC_AUTH_REDIRECT_URL_DEV`: Development environment deep link
- `EXPO_PUBLIC_AUTH_REDIRECT_URL_PREVIEW`: Staging environment deep link
- `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`: Service role key for server-side operations

**Magic Link Setup Checklist:**
1. Go to [supabase.com](https://supabase.com) → Your Project
2. Navigate to Settings → API
3. Copy Project URL and anon public key
4. Configure Auth settings:
   - **Site URL**: Set to your app's deep link scheme (`yeser://auth/callback`)
   - **Additional Redirect URLs**: Add environment-specific URLs
   - **Email Templates**: Configure Turkish magic link template
   - **Rate Limiting**: Set appropriate limits (5 emails/hour for production)

**Required Supabase Auth Configuration:**
```sql
-- In Supabase SQL Editor, ensure these settings:
-- 1. Site URL: yeser://auth/callback
-- 2. Additional Redirect URLs:
--    - yeser-dev://auth/callback (development)
--    - yeser-preview://auth/callback (staging)
--    - https://your-domain.com (if supporting web)
-- 3. Email Auth: Enabled
-- 4. Email Confirmations: Enabled
-- 5. Magic Link Template: Turkish version (see setup guide)
```

#### Firebase Configuration (Analytics)

```bash
# Firebase Configuration for Analytics
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

**Description:**
- Complete Firebase configuration for analytics integration
- Required for user behavior tracking and crash reporting

**Where to find:**
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select your project → Project Settings
3. Under "Your apps" section, find the web app config

#### OAuth Configuration

```bash
# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id

# OAuth Redirect Configuration
EXPO_PUBLIC_REDIRECT_URI=https://your-project.supabase.co/auth/v1/callback
```

**Description:**
- Platform-specific Google OAuth client IDs
- Required for Google Sign-In functionality

**Where to find:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Create OAuth 2.0 Client IDs for each platform

#### App Configuration

```bash
# App Metadata
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_BUILD_NUMBER=1
EXPO_PUBLIC_APP_ENVIRONMENT=development

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASHLYTICS=true
EXPO_PUBLIC_ENABLE_THROWBACK=true
EXPO_PUBLIC_ENABLE_VARIED_PROMPTS=true

# Debug Settings
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_LOG_LEVEL=info
```

### Optional Environment Variables

#### API Configuration

```bash
# Custom API Settings (if using custom backend)
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com
EXPO_PUBLIC_API_TIMEOUT=10000
EXPO_PUBLIC_API_RETRY_COUNT=3

# Rate Limiting
EXPO_PUBLIC_RATE_LIMIT_REQUESTS=100
EXPO_PUBLIC_RATE_LIMIT_WINDOW=60000
```

#### Development Settings

```bash
# Development Configuration
EXPO_PUBLIC_DEV_SERVER_URL=http://localhost:3000
EXPO_PUBLIC_ENABLE_DEV_TOOLS=true
EXPO_PUBLIC_MOCK_DATA=false

# Testing Configuration
EXPO_PUBLIC_TEST_MODE=false
EXPO_PUBLIC_TEST_USER_EMAIL=test@example.com
```

## 📄 Configuration Files

### .env File Structure

Create a `.env` file in the project root:

```bash
# =============================================================================
# YESER GRATITUDE APP - ENVIRONMENT CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# SUPABASE CONFIGURATION
# -----------------------------------------------------------------------------
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# -----------------------------------------------------------------------------
# FIREBASE CONFIGURATION (Analytics)
# -----------------------------------------------------------------------------
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# -----------------------------------------------------------------------------
# OAUTH CONFIGURATION
# -----------------------------------------------------------------------------
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id
EXPO_PUBLIC_REDIRECT_URI=https://your-project.supabase.co/auth/v1/callback

# -----------------------------------------------------------------------------
# APP CONFIGURATION
# -----------------------------------------------------------------------------
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_BUILD_NUMBER=1
EXPO_PUBLIC_APP_ENVIRONMENT=development

# -----------------------------------------------------------------------------
# FEATURE FLAGS
# -----------------------------------------------------------------------------
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASHLYTICS=true
EXPO_PUBLIC_ENABLE_THROWBACK=true
EXPO_PUBLIC_ENABLE_VARIED_PROMPTS=true

# -----------------------------------------------------------------------------
# DEBUG SETTINGS
# -----------------------------------------------------------------------------
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_LOG_LEVEL=info
```

### Environment-Specific Configurations

#### Development (.env.development)

```bash
# Development Environment
EXPO_PUBLIC_APP_ENVIRONMENT=development
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_ENABLE_DEV_TOOLS=true
EXPO_PUBLIC_MOCK_DATA=false

# Development Supabase (if different)
EXPO_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key

# Relaxed rate limiting for development
EXPO_PUBLIC_RATE_LIMIT_REQUESTS=1000
EXPO_PUBLIC_RATE_LIMIT_WINDOW=60000
```

#### Staging (.env.staging)

```bash
# Staging Environment
EXPO_PUBLIC_APP_ENVIRONMENT=staging
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_LOG_LEVEL=info
EXPO_PUBLIC_ENABLE_DEV_TOOLS=true

# Staging Supabase
EXPO_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key

# Staging-specific features
EXPO_PUBLIC_ENABLE_BETA_FEATURES=true
```

#### Production (.env.production)

```bash
# Production Environment
EXPO_PUBLIC_APP_ENVIRONMENT=production
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_LOG_LEVEL=warn
EXPO_PUBLIC_ENABLE_DEV_TOOLS=false

# Production Supabase
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key

# Production optimizations
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASHLYTICS=true
EXPO_PUBLIC_RATE_LIMIT_REQUESTS=100
EXPO_PUBLIC_RATE_LIMIT_WINDOW=60000
```

## ⚙️ Configuration Usage

### Accessing Environment Variables

```typescript
// src/utils/config.ts
interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
    authRedirectUrl?: string;
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  oauth: {
    googleClientIds: {
      ios: string;
      android: string;
      web: string;
    };
    redirectUri: string;
  };
  app: {
    version: string;
    buildNumber: string;
    environment: 'development' | 'staging' | 'production';
  };
  features: {
    analytics: boolean;
    crashlytics: boolean;
    throwback: boolean;
    variedPrompts: boolean;
  };
  debug: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export const config: AppConfig = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    authRedirectUrl: process.env.EXPO_PUBLIC_SUPABASE_AUTH_REDIRECT_URL,
  },
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
  oauth: {
    googleClientIds: {
      ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS!,
      android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID!,
      web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB!,
    },
    redirectUri: process.env.EXPO_PUBLIC_REDIRECT_URI!,
  },
  app: {
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    buildNumber: process.env.EXPO_PUBLIC_APP_BUILD_NUMBER || '1',
    environment: (process.env.EXPO_PUBLIC_APP_ENVIRONMENT as any) || 'development',
  },
  features: {
    analytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
    crashlytics: process.env.EXPO_PUBLIC_ENABLE_CRASHLYTICS === 'true',
    throwback: process.env.EXPO_PUBLIC_ENABLE_THROWBACK === 'true',
    variedPrompts: process.env.EXPO_PUBLIC_ENABLE_VARIED_PROMPTS === 'true',
  },
  debug: {
    enabled: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
    logLevel: (process.env.EXPO_PUBLIC_LOG_LEVEL as any) || 'info',
  },
};

// Validation function
export const validateConfig = (): void => {
  const required = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};
```

### Environment-Specific Initialization

```typescript
// src/utils/environmentSetup.ts
import { config, validateConfig } from './config';

export const initializeEnvironment = async (): Promise<void> => {
  try {
    // Validate configuration
    validateConfig();

    // Environment-specific setup
    switch (config.app.environment) {
      case 'development':
        await setupDevelopmentEnvironment();
        break;
      case 'staging':
        await setupStagingEnvironment();
        break;
      case 'production':
        await setupProductionEnvironment();
        break;
    }

    console.log(`✅ Environment initialized: ${config.app.environment}`);
  } catch (error) {
    console.error('❌ Environment initialization failed:', error);
    throw error;
  }
};

const setupDevelopmentEnvironment = async (): Promise<void> => {
  // Enable additional logging
  if (config.debug.enabled) {
    console.log('🔧 Development mode enabled');
  }

  // Set up development-specific configurations
  // e.g., disable analytics, enable debug tools
};

const setupStagingEnvironment = async (): Promise<void> => {
  // Staging-specific setup
  console.log('🧪 Staging environment configured');
};

const setupProductionEnvironment = async (): Promise<void> => {
  // Production optimizations
  console.log('🚀 Production environment configured');
  
  // Disable debugging
  if (config.debug.enabled) {
    console.warn('⚠️ Debug mode should be disabled in production');
  }
};
```

## 🔐 Security Considerations

### Environment Variable Security

#### Safe Variables (Client-Side)
These are safe to expose in the client:

```bash
# Safe - Public keys and URLs
EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=project-id
EXPO_PUBLIC_APP_VERSION=1.0.0
```

#### Sensitive Variables (Server-Side Only)
These should NEVER be exposed to the client:

```bash
# DANGER - Never use EXPO_PUBLIC_ prefix for these!
SUPABASE_SERVICE_ROLE_KEY=service-role-secret
FIREBASE_PRIVATE_KEY=private-key
GOOGLE_CLIENT_SECRET=oauth-secret
DATABASE_PASSWORD=db-password
```

### Validation and Type Safety

```typescript
// src/utils/envValidation.ts
import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  EXPO_PUBLIC_APP_ENVIRONMENT: z.enum(['development', 'staging', 'production']),
  EXPO_PUBLIC_ENABLE_ANALYTICS: z.string().transform(val => val === 'true'),
});

export const validateEnvironment = () => {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
};
```

## 🛠️ Setup Instructions

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd yeser

# Copy environment template
cp .env.example .env

# Install dependencies
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings → API
3. Update `.env` with your Supabase credentials
4. Run the database setup scripts (see [Database Documentation](./09-database.md))

### 3. Configure Firebase (Optional)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Analytics
3. Add your app (iOS/Android/Web)
4. Copy the configuration to your `.env` file

### 4. Configure OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials for each platform
3. Add the client IDs to your `.env` file
4. Configure authorized redirect URIs in Google Console

### 5. Verify Configuration

```bash
# Test the configuration
npm run test:config

# Start the development server
npx expo start
```

## 📝 Environment File Templates

### .env.example

```bash
# =============================================================================
# YESER GRATITUDE APP - ENVIRONMENT CONFIGURATION TEMPLATE
# =============================================================================
# 
# Instructions:
# 1. Copy this file to .env
# 2. Replace all placeholder values with your actual configuration
# 3. Never commit your .env file to version control
# 
# =============================================================================

# -----------------------------------------------------------------------------
# SUPABASE CONFIGURATION (Required)
# Get from: https://supabase.com → Your Project → Settings → API
# -----------------------------------------------------------------------------
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# -----------------------------------------------------------------------------
# FIREBASE CONFIGURATION (Optional - for Analytics)
# Get from: https://console.firebase.google.com → Project Settings
# -----------------------------------------------------------------------------
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# -----------------------------------------------------------------------------
# OAUTH CONFIGURATION (Required for Google Sign-In)
# Get from: https://console.cloud.google.com → APIs & Services → Credentials
# -----------------------------------------------------------------------------
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id
EXPO_PUBLIC_REDIRECT_URI=https://your-project.supabase.co/auth/v1/callback

# -----------------------------------------------------------------------------
# APP CONFIGURATION
# -----------------------------------------------------------------------------
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_BUILD_NUMBER=1
EXPO_PUBLIC_APP_ENVIRONMENT=development

# -----------------------------------------------------------------------------
# FEATURE FLAGS (true/false)
# -----------------------------------------------------------------------------
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASHLYTICS=true
EXPO_PUBLIC_ENABLE_THROWBACK=true
EXPO_PUBLIC_ENABLE_VARIED_PROMPTS=true

# -----------------------------------------------------------------------------
# DEBUG SETTINGS
# -----------------------------------------------------------------------------
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_LOG_LEVEL=info
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Environment Variables Not Loading

```bash
# Check if variables are accessible
npx expo start --clear

# Verify in app
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
```

#### 2. Invalid Configuration

```typescript
// Add runtime validation
useEffect(() => {
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
    Alert.alert(
      'Configuration Error',
      'Supabase URL is not configured. Please check your .env file.'
    );
  }
}, []);
```

#### 3. OAuth Issues

Check that your redirect URIs match exactly:
- Supabase: `https://your-project.supabase.co/auth/v1/callback`
- Google Console: Must include the exact same URL

#### 4. Build Issues

```bash
# Clear Expo cache
npx expo start --clear

# Restart Metro bundler
npx expo start --reset-cache

# Check for environment variable typos
npm run lint:env
```

### Environment Variable Debugging

```typescript
// src/utils/debugConfig.ts
export const debugConfiguration = () => {
  if (__DEV__) {
    console.group('🔧 Environment Configuration');
    console.log('Environment:', process.env.EXPO_PUBLIC_APP_ENVIRONMENT);
    console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('Firebase Project:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
    console.log('Analytics Enabled:', process.env.EXPO_PUBLIC_ENABLE_ANALYTICS);
    console.groupEnd();
  }
};
```

---

This environment configuration documentation provides a complete guide to setting up and managing all configuration aspects of the Yeser gratitude app, ensuring proper setup across different environments and deployment scenarios. 