# 🏗️ **Professional Build System Guide**

## **Overview**

Yeşer uses a professional, multi-environment build system that provides:

- **Easy Development**: Quick debugging with hot reload
- **Staging Testing**: Preview builds for testing before production
- **Production Ready**: Optimized builds for app store deployment
- **Type Safety**: Full TypeScript validation and environment variable checking
- **Security**: Secure environment variable management

---

## **🚀 Quick Start**

### **Local Development**

```bash
# Start development server with development environment
npm run start:dev

# Run on specific platforms
npm run android
npm run ios
```

### **Building for Testing (Preview)**

```bash
# Build preview version for internal testing
npm run build:preview

# Build for specific platform
npm run build:preview:android
npm run build:preview:ios
```

### **Building for Production**

```bash
# Build production version for app stores
npm run build:production

# Build Android App Bundle (recommended for Play Store)
npm run build:production:aab

# Build for specific platform
npm run build:production:android
npm run build:production:ios
```

---

## **🌍 Environment Management**

### **Development Environment**

- **Purpose**: Local development and debugging
- **App Name**: "Yeşer (Dev)"
- **Bundle ID**: `com.arthlor.yeser.dev`
- **URL Scheme**: `yeser-dev://`
- **Features**: All debugging tools enabled, local Supabase fallbacks
- **Analytics**: Disabled by default

### **Preview Environment**

- **Purpose**: Internal testing and staging
- **App Name**: "Yeşer (Preview)"
- **Bundle ID**: `com.arthlor.yeser.preview`
- **URL Scheme**: `yeser-preview://`
- **Features**: Production-like with analytics enabled
- **Distribution**: Internal testing only

### **Production Environment**

- **Purpose**: App store releases
- **App Name**: "Yeşer"
- **Bundle ID**: `com.arthlor.yeser`
- **URL Scheme**: `yeser://`
- **Features**: All optimizations enabled, full analytics
- **Distribution**: Public app stores

---

## **🔧 Environment Variables**

### **Required Variables**

These must be set in EAS secrets for preview/production builds:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **Recommended Variables**

For full functionality (Google OAuth):

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id
```

### **Feature Flags**

Control feature rollouts:

```bash
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_THROWBACK=true
EXPO_PUBLIC_FF_OPTIMIZED_MAGIC_LINK_V2=true
EXPO_PUBLIC_FF_BATCHED_STATE_UPDATES=true
EXPO_PUBLIC_OPTIMIZATION_ROLLOUT=full
```

### **Local Development Setup**

1. Copy environment template: `cp .env.example .env`
2. Fill in your development values
3. Never commit `.env` to git (it's already in `.gitignore`)

---

## **🔍 Build Validation**

### **Automatic Validation**

Before every preview/production build, the system automatically validates:

- ✅ Required environment variables
- ✅ File structure integrity
- ✅ Dependencies installed
- ✅ EAS configuration
- ✅ TypeScript compilation
- ✅ ESLint compliance

### **Manual Validation**

```bash
# Validate current environment
npm run validate:build

# Check specific environment variables
npm run validate:env
```

---

## **📱 Platform-Specific Builds**

### **Android**

```bash
# Development (local)
npm run build:dev:android

# Preview (internal testing)
npm run build:preview:android

# Production APK
npm run build:production:android

# Production App Bundle (recommended)
npm run build:production:aab
```

### **iOS**

```bash
# Development (local)
npm run build:dev:ios

# Preview (internal testing)
npm run build:preview:ios

# Production
npm run build:production:ios
```

---

## **🚀 Deployment Workflow**

### **Development → Preview → Production**

1. **Develop locally**:

   ```bash
   npm run start:dev
   ```

2. **Test with preview build**:

   ```bash
   npm run build:preview
   ```

3. **Deploy to production**:
   ```bash
   npm run build:production
   npm run submit:production
   ```

### **Over-the-Air Updates**

```bash
# Update preview channel
npm run update:preview

# Update production channel
npm run update:production
```

---

## **🔒 Security Best Practices**

### **Environment Variables**

- ✅ Use EAS secrets for sensitive data
- ✅ Never commit actual values to git
- ✅ Use different values per environment
- ✅ Validate all variables before builds

### **Build Security**

- ✅ Production builds use release configurations
- ✅ Debug symbols removed in production
- ✅ Automatic security audits before builds
- ✅ Type-safe configuration management

---

## **🛠️ Troubleshooting**

### **Common Issues**

**Build validation fails**:

```bash
# Check what's missing
npm run validate:build

# Fix TypeScript errors
npm run type-check

# Fix linting issues
npm run lint:fix
```

**Missing environment variables**:

```bash
# Check current configuration
npm run validate:env

# Add missing variables to EAS secrets
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "your-value"
```

**Development server won't start**:

```bash
# Clear cache and restart
npm run start:dev
```

### **Environment Switching**

```bash
# Switch to development mode
npm run start:dev

# Switch to preview mode (testing production data)
npm run start:preview

# Switch to production mode (for final testing)
npm run start:prod
```

---

## **📊 Build Profiles Summary**

| Profile          | Environment | Purpose                 | Analytics | Debug | Distribution |
| ---------------- | ----------- | ----------------------- | --------- | ----- | ------------ |
| `development`    | Local       | Development & debugging | ❌        | ✅    | Local only   |
| `preview`        | Staging     | Internal testing        | ✅        | ❌    | Internal     |
| `production`     | Production  | App store release       | ✅        | ❌    | Public       |
| `production-aab` | Production  | Play Store bundle       | ✅        | ❌    | Public       |

---

## **🎯 Best Practices**

1. **Always validate before building**: `npm run validate:build`
2. **Test with preview builds** before production
3. **Use environment-specific secrets** in EAS
4. **Keep .env for local development only**
5. **Use semantic versioning** for releases
6. **Monitor build performance** and bundle size
7. **Review feature flags** before production deployment

This professional build system ensures reliable, secure, and efficient development-to-production workflows! 🚀
