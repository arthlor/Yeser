# CI/CD Pipeline Setup Guide

This guide provides step-by-step instructions for setting up the complete CI/CD pipeline for the Yeser gratitude app.

## 🚀 Quick Start

1. **Prerequisites Setup**
2. **Environment Configuration**
3. **GitHub Secrets Configuration**
4. **EAS Project Setup**
5. **First Pipeline Run**

---

## 📋 Prerequisites

### Required Accounts & Services

- [ ] **GitHub Account** with repository access
- [ ] **Expo Account** ([expo.dev](https://expo.dev))
- [ ] **Apple Developer Account** (for iOS deployment)
- [ ] **Google Play Console Account** (for Android deployment)
- [ ] **Supabase Projects** (development, staging, production)

### Required Tools

```bash
# Install EAS CLI globally
npm install -g eas-cli@latest

# Login to Expo
eas login

# Verify installation
eas --version
```

---

## 🔐 Environment Configuration

### 1. EAS Project Setup

```bash
# Initialize EAS project (if not already done)
eas init

# Configure project ID
eas project:set --id your-actual-eas-project-id
```

### 2. Environment Variables Structure

Create these environment configurations:

#### Development Environment

```bash
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-dev-client-id
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

#### Staging Environment

```bash
EXPO_PUBLIC_ENV=preview
EXPO_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-staging-client-id
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

#### Production Environment

```bash
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-prod-client-id
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

---

## 🔑 GitHub Secrets Configuration

Navigate to your GitHub repository → Settings → Secrets and variables → Actions

### Required Secrets

#### Expo & EAS

```bash
EXPO_TOKEN=your-expo-access-token
```

**How to get Expo Token:**

```bash
eas login
eas user:token:create --name "github-actions"
```

#### Supabase Environments

**Staging:**

```bash
STAGING_SUPABASE_URL=https://your-staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=your-staging-anon-key
```

**Production:**

```bash
PRODUCTION_SUPABASE_URL=https://your-prod-project.supabase.co
PRODUCTION_SUPABASE_ANON_KEY=your-prod-anon-key
```

#### App Store Credentials

**Apple:**

```bash
APPLE_ID=your-apple-id@example.com
APPLE_TEAM_ID=ABCD123456
ASC_APP_ID=1234567890
```

**Google Play:**

```bash
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-json
```

---

## 🏗️ EAS Configuration Details

### Build Profiles Explained

#### Development Profile

- **Purpose**: Local development and testing
- **Distribution**: Internal only
- **Build Type**: Debug builds with development client
- **Usage**: `eas build --profile development`

#### Preview Profile

- **Purpose**: Internal testing and QA
- **Distribution**: Internal (TestFlight, Google Play Internal)
- **Build Type**: Release builds for testing
- **Usage**: `eas build --profile preview`

#### Production Profile

- **Purpose**: App store releases
- **Distribution**: Public app stores
- **Build Type**: Optimized release builds
- **Usage**: `eas build --profile production`

### Authentication Deep Link Configuration

The pipeline automatically configures these URL schemes:

- **Development**: `yeser-dev://auth/callback`
- **Preview**: `yeser-preview://auth/callback`
- **Production**: `yeser://auth/callback`

### Supabase Auth Configuration

For each environment, configure these redirect URLs in Supabase:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add redirect URLs:
   ```
   yeser-dev://auth/callback     (Development)
   yeser-preview://auth/callback (Preview)
   yeser://auth/callback        (Production)
   ```

---

## 🔄 Pipeline Workflow

### Automatic Triggers

#### On Push to `develop` branch:

- ✅ Quality checks (lint, test, TypeScript)
- ✅ Security scan
- ✅ Preview build (iOS + Android)

#### On Push to `main` branch:

- ✅ Quality checks
- ✅ Security scan
- ✅ Production build (iOS + Android)
- ✅ Auto-deployment (if commit message contains `[deploy]`)

#### On Pull Requests:

- ✅ Quality checks
- ✅ Security scan
- ✅ Performance analysis

### Manual Deployment

```bash
# Build and submit manually
npm run build:production
npm run submit:production

# Or with commit message trigger
git commit -m "feat: new feature [deploy]"
git push origin main
```

---

## 📱 App Store Setup

### iOS App Store Connect

1. **Create App Record**

   - Bundle ID: `com.yeser`
   - App Name: `Yeşer`
   - SKU: `yeser`

2. **Configure App Information**

   - Privacy Policy URL
   - App Category: Health & Fitness
   - Content Rating: 4+

3. **Upload Screenshots & Metadata**
   - Required screenshot sizes for all devices
   - App description in multiple languages

### Android Google Play Console

1. **Create App**

   - App Name: `Yeşer`
   - Default Language: Turkish
   - App Category: Health & Fitness

2. **Configure Store Listing**

   - Upload app icon (512x512 PNG)
   - Upload feature graphic (1024x500 PNG)
   - Add screenshots for all device types

3. **Setup Service Account**
   ```bash
   # Create service account in Google Cloud Console
   # Download JSON key file
   # Convert to base64 for GitHub secrets
   base64 -i service-account-key.json | pbcopy
   ```

---

## 🔍 Monitoring & Troubleshooting

### Build Status Monitoring

Check build status:

```bash
# List recent builds
eas build:list --platform all --status finished --limit 10

# View specific build
eas build:view [build-id]

# Check build logs
eas build:log [build-id]
```

### Common Issues & Solutions

#### 1. Environment Variables Not Found

```bash
# Verify environment setup
npm run validate-env:dev
npm run validate-env:preview
npm run validate-env:prod
```

#### 2. Authentication Deep Links Not Working

- Check URL scheme configuration in app.config.js
- Verify Supabase redirect URLs match exactly
- Test deep links manually: `npx uri-scheme open yeser://auth/callback --ios`

#### 3. Build Failures

- Check EAS build logs
- Verify all required secrets are set in GitHub
- Ensure environment variables are properly configured

#### 4. Submission Failures

- Verify app store credentials
- Check bundle identifiers match store configuration
- Ensure provisioning profiles are valid

### Performance Monitoring

The pipeline includes automatic performance checks:

- Bundle size analysis
- TypeScript compilation time
- Test execution time
- Security vulnerability scans

---

## 🚨 Emergency Procedures

### Rollback Process

1. **Identify Issue**

   ```bash
   # Check recent builds
   eas build:list --status finished --limit 5
   ```

2. **Rollback App Store Release**

   - iOS: Use App Store Connect to reject/remove current version
   - Android: Use Google Play Console to halt rollout

3. **Deploy Emergency Fix**

   ```bash
   # Create hotfix branch
   git checkout -b hotfix/emergency-fix

   # Make critical fixes
   # ...

   # Deploy with emergency flag
   git commit -m "hotfix: critical fix [deploy]"
   git push origin main
   ```

4. **Over-the-Air Update**
   ```bash
   # Deploy OTA update for immediate fix
   npm run update:production -- "Emergency security fix"
   ```

---

## ✅ Deployment Checklist

Before deploying to production:

### Pre-Deployment

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] App store metadata updated
- [ ] Screenshots and assets ready
- [ ] Privacy policy and terms updated

### During Deployment

- [ ] Monitor build process
- [ ] Verify deployment to staging first
- [ ] Test critical user flows
- [ ] Check authentication flows
- [ ] Verify push notifications

### Post-Deployment

- [ ] Monitor crash reports
- [ ] Check user feedback
- [ ] Verify analytics tracking
- [ ] Monitor performance metrics
- [ ] Test rollback procedures

---

## 🎯 Next Steps

1. **Configure Secrets**: Add all required GitHub secrets
2. **Test Pipeline**: Push to feature branch to test workflow
3. **Setup Monitoring**: Configure crash reporting and analytics
4. **Documentation**: Update team documentation with specific credentials
5. **Training**: Train team on deployment procedures

---

## 📞 Support

- **EAS Issues**: [Expo Documentation](https://docs.expo.dev/eas/)
- **GitHub Actions**: [Actions Documentation](https://docs.github.com/en/actions)
- **App Store**: [Apple Developer Documentation](https://developer.apple.com/documentation/)
- **Google Play**: [Play Console Help](https://support.google.com/googleplay/android-developer/)

**Emergency Contact**: Create team communication channel for deployment issues.
