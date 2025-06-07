# Production Deployment Guide - Yeşer App

This guide provides step-by-step instructions for deploying the production readiness improvements safely.

## 🎯 Pre-Deployment Checklist

### ✅ Requirements Check

- [ ] You have admin access to Supabase project
- [ ] You have the actual iOS Google Sign-In credentials
- [ ] You have tested in staging/development environment
- [ ] You have rollback plan ready
- [ ] You have monitoring in place

### ⚠️ Critical Prerequisites

- [ ] **MUST HAVE**: Real iOS reversed client ID from Google Cloud Console
- [ ] **MUST HAVE**: Staging environment tested successfully
- [ ] **MUST HAVE**: Database backup taken (if desired)

## 🚀 Deployment Steps

### Step 1: Update iOS Google Sign-In Configuration

**File**: `app.json` (line 54)

```diff
"@react-native-google-signin/google-signin",
{
-  "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"
+  "iosUrlScheme": "com.googleusercontent.apps.123456789-abcdefghijklmnopqrstuvwxyz.googleusercontent.com"
}
```

**How to get the correct value**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Find your iOS OAuth 2.0 client ID
5. Copy the "Client ID" value
6. The iOS URL scheme is this value in reverse: `com.googleusercontent.apps.{YOUR_CLIENT_ID}`

### Step 2: Deploy Database Migration

**In Supabase SQL Editor**:

1. **Open Supabase Dashboard** → Your Project → SQL Editor
2. **Copy contents** of `docs/migrations/production-optimizations.sql`
3. **Paste and Run** the entire script
4. **Verify success** - you should see success messages for:
   - ✅ 3 functions created
   - ✅ 3 indexes created
   - ✅ Permissions granted

**Test the functions** (run these one by one):

```sql
-- Test 1: Fetch multiple random prompts
SELECT * FROM get_multiple_random_active_prompts(5);

-- Test 2: Get user entries count (will be 0 if no entries)
SELECT get_user_gratitude_entries_count();
```

### Step 3: Deploy Application Code

**Current branch**: `feature/production-readiness`

1. **Test build locally**:

   ```bash
   npm run build
   # or
   expo build
   ```

2. **Create production build**:

   ```bash
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

3. **Deploy to app stores** (when ready):
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

### Step 4: Test Critical Functionality

**After deployment, test these features**:

- [ ] **Google Sign-In on iOS** (CRITICAL)

  - Download app from TestFlight/App Store
  - Test Google sign-in flow
  - Verify user can authenticate

- [ ] **Prompt fetching** (varies prompts work)

  - Check varied prompts toggle in settings
  - Verify prompts load correctly
  - Test prompt refresh functionality

- [ ] **Entry deletion** (delete entire day)

  - Create test entry with multiple statements
  - Delete entire entry
  - Verify it's removed completely

- [ ] **General functionality**
  - Create gratitude entries
  - View past entries
  - Check statistics
  - Test notifications

## 🚨 Emergency Rollback Procedure

**If something goes wrong during deployment:**

### Database Rollback (if database issues)

1. **Open Supabase SQL Editor**
2. **Run the revert script**:
   ```sql
   -- Copy and paste contents of:
   -- docs/migrations/revert-production-optimizations.sql
   ```
3. **Verify rollback**:
   - Check that functions are removed
   - Verify original functionality works

### Application Rollback (if app issues)

1. **Deploy previous version**:

   ```bash
   # If using EAS
   eas build --platform all --profile production

   # Use the previous working commit
   git checkout {previous-working-commit}
   ```

2. **Update app stores with previous version**

## 📊 Post-Deployment Monitoring

### Key Metrics to Watch

**Performance Metrics**:

- [ ] API response times (should be faster)
- [ ] Error rates (should be same or lower)
- [ ] App startup time
- [ ] Memory usage

**Functional Metrics**:

- [ ] Google Sign-In success rate (iOS especially)
- [ ] Prompt loading success rate
- [ ] Entry creation/deletion success rate
- [ ] User retention (no drop expected)

**Error Monitoring**:

- [ ] Check error logs for new RPC function calls
- [ ] Monitor TypeScript/JavaScript errors
- [ ] Watch for authentication issues

### Timeline for Monitoring

- **First 1 hour**: Active monitoring
- **First 24 hours**: Frequent checks
- **First week**: Daily monitoring
- **Ongoing**: Normal monitoring cadence

## 📈 Success Criteria

### ✅ Deployment Successful If:

- [ ] Google Sign-In works on iOS production builds
- [ ] All existing functionality preserved
- [ ] No increase in error rates
- [ ] Performance improvements visible
- [ ] User experience improved (no blocking alerts)

### 🚨 Rollback Immediately If:

- [ ] Google Sign-In fails on iOS
- [ ] Error rates spike significantly
- [ ] Critical functionality broken
- [ ] Performance worse than before
- [ ] User complaints about broken features

## 🔄 Rollback → Fix → Redeploy Process

If rollback was needed:

1. **Investigate** the issue in staging
2. **Fix** the problem
3. **Test** thoroughly in staging
4. **Re-run** this deployment guide
5. **Monitor** even more carefully on re-deployment

## 📞 Emergency Contacts

**In case of critical issues:**

- Ensure you have contact info for:
  - Database admin
  - App store account holder
  - Key stakeholders
  - Development team lead

---

**Remember**: This deployment includes performance optimizations that should make the app faster and more scalable. The changes are designed to be safe and backwards compatible, but having a rollback plan is always wise for production deployments.

Good luck with your production deployment! 🚀
