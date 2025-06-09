# 🚀 Yeşer CI/CD Pipeline

## Overview

This repository uses GitHub Actions for continuous integration and deployment. The pipeline is optimized for React Native apps built with Expo and EAS Build.

## 🔄 Pipeline Structure

### 1. **Quality Assurance** (`quality-check`)

**Triggers:** Every push and pull request

- 🔍 TypeScript compilation check
- 🔧 ESLint code analysis
- 🎨 Prettier formatting validation
- 🔒 Security audit (npm audit)
- 🔍 Environment validation

### 2. **Preview Build** (`build-preview`)

**Triggers:** Push to `develop` branch or pull requests

- 📱 Builds for internal testing
- 🔗 Uses staging Supabase environment
- 📦 Creates iOS and Android preview builds

### 3. **Production Build** (`build-production`)

**Triggers:** Push to `main` branch

- 🏭 Builds for app store submission
- 🔐 Uses production Supabase environment
- 📦 Creates store-ready iOS and Android builds

### 4. **App Store Deployment** (`deploy-stores`)

**Triggers:** Push to `main` with `[deploy]` in commit message

- 🍎 Submits to App Store Connect
- 🤖 Submits to Google Play Console
- 🚀 Automated store submission

### 5. **Code Analysis** (`analysis`)

**Triggers:** Pull requests and pushes to `main`

- 🔒 Advanced security scanning
- ⚡ Performance analysis
- 📦 Bundle optimization checks

## 🔐 Required Secrets

Configure these secrets in your GitHub repository settings:

### Expo & EAS

```
EXPO_TOKEN=your_expo_access_token
```

### Staging Environment

```
STAGING_SUPABASE_URL=your_staging_supabase_url
STAGING_SUPABASE_ANON_KEY=your_staging_supabase_anon_key
```

### Production Environment

```
PRODUCTION_SUPABASE_URL=your_production_supabase_url
PRODUCTION_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

## 🚀 Deployment Workflow

### Development Flow

1. **Feature Development** → Push to feature branch
2. **Pull Request** → Triggers quality checks + preview build
3. **Merge to develop** → Triggers preview build for testing
4. **Merge to main** → Triggers production build
5. **Store Deployment** → Push to main with `[deploy]` in commit message

### Example Deployment Commands

```bash
# Deploy to app stores
git commit -m "feat: new gratitude features [deploy]"
git push origin main
```

## 📊 Build Profiles

The pipeline uses EAS build profiles configured in `eas.json`:

- **Preview**: Internal testing builds
- **Production**: App store submission builds

## 🔧 Local Development

To test the pipeline locally:

```bash
# Run quality checks locally
npm run lint:check
npm run type-check
npm run validate-env:dev

# Test builds locally
eas build --platform all --profile preview --local
```

## 🚨 Pipeline Status

Check the Actions tab in GitHub to monitor:

- ✅ Build status
- 📊 Quality metrics
- 🔒 Security scan results
- 📱 App deployment status

## 🛠️ Maintenance

The pipeline automatically:

- 📦 Caches dependencies for faster builds
- 🔄 Updates npm packages securely
- 🔍 Scans for vulnerabilities
- ⚡ Optimizes build performance

## 📞 Support

If you encounter pipeline issues:

1. Check the Actions logs for detailed error messages
2. Verify all required secrets are configured
3. Ensure EAS CLI is properly authenticated
4. Check Expo and Supabase service status
