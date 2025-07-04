# 🚨 Android Notification Fix Roadmap

## Overview

This roadmap addresses the critical issues preventing Android notifications from working. The primary issue is FCM availability checks blocking token registration, leaving the database without tokens needed for cron jobs.

---

## 🔍 Phase 1: Immediate Diagnostics

### Step 1: Check Current Database State

- [ ] **Check if any push tokens exist in database**

  ```sql
  -- Run in Supabase SQL Editor
  SELECT COUNT(*) as total_tokens FROM push_tokens;
  SELECT COUNT(*) as active_tokens FROM push_tokens WHERE is_active = true;
  ```

- [ ] **Check user notification settings vs actual tokens**

  ```sql
  SELECT
    p.id,
    p.username,
    p.notifications_enabled,
    COUNT(pt.id) as token_count,
    CASE
      WHEN p.notifications_enabled = true AND COUNT(pt.id) = 0 THEN 'MISSING_TOKENS'
      WHEN p.notifications_enabled = false THEN 'NOTIFICATIONS_DISABLED'
      ELSE 'OK'
    END as status
  FROM profiles p
  LEFT JOIN push_tokens pt ON p.id = pt.user_id AND pt.is_active = true
  GROUP BY p.id, p.username, p.notifications_enabled
  ORDER BY p.notifications_enabled DESC;
  ```

- [ ] **Test notification function eligibility**
  ```sql
  -- This should return users eligible for notifications
  SELECT p.id as user_id, p.username
  FROM public.profiles p
  JOIN public.push_tokens pt ON p.id = pt.user_id
  WHERE p.notifications_enabled = true AND pt.is_active = true;
  ```

### Step 2: Check Environment Configuration

- [ ] **Verify environment variables are set correctly**

  - Check `EXPO_PUBLIC_FCM_ENABLED=true` in your environment
  - Check `EXPO_PUBLIC_ENV` value (should be 'production' or 'preview' for EAS builds)

- [ ] **Verify Google Services configuration**
  - Confirm `google-services.json` exists and is properly configured
  - Check `plugins/withGoogleServices.js` is working correctly

---

## 🛠️ Phase 2: Critical Code Fixes

### Step 3: Fix FCM Blocking Issue (CRITICAL)

- [ ] **Modify `src/services/notificationService.ts`**

  **Find this code (around line 285-299):**

  ```typescript
  // ✅ Step 5: FCM blocking logic (only for local dev)
  const isLocalDev = !Constants.appOwnership || Constants.appOwnership === 'expo';
  if (Platform.OS === 'android' && !this.fcmAvailable && isLocalDev) {
    logger.info('⚠️ Skipping push token registration - FCM not available in local development');
    logger.info('ℹ️ This is normal for npx expo run:android - notifications work in EAS builds');
    return; // 🚨 THIS PREVENTS TOKEN REGISTRATION
  }
  ```

  **Replace with:**

  ```typescript
  // ✅ Step 5: FCM availability check (warn but don't block)
  const isLocalDev = !Constants.appOwnership || Constants.appOwnership === 'expo';
  if (Platform.OS === 'android' && !this.fcmAvailable && isLocalDev) {
    logger.warn('⚠️ FCM not available in local development - proceeding anyway');
    logger.warn(
      'ℹ️ Token will be registered for Expo push service - notifications work in EAS builds'
    );
    // Continue with token registration instead of returning
  }
  ```

### Step 4: Add Enhanced Error Logging

- [ ] **Enhance error logging in `registerPushToken` method**

  **Find the Supabase function call (around line 367):**

  ```typescript
  const { error } = await supabaseService.getClient().rpc('register_push_token', {
    p_user_id: session.user.id,
    p_expo_push_token: this.expoPushToken,
    p_platform: Platform.OS,
  });

  if (error) {
    logger.error('❌ Supabase function call failed:', {
      error: error.message,
      userId: session.user.id,
      tokenLength: this.expoPushToken.length,
    });
  ```

  **Replace with:**

  ```typescript
  const { error } = await supabaseService.getClient().rpc('register_push_token', {
    p_user_id: session.user.id,
    p_expo_push_token: this.expoPushToken,
    p_platform: Platform.OS,
  });

  if (error) {
    logger.error('❌ Supabase function call failed:', {
      error: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
      userId: session.user.id,
      tokenLength: this.expoPushToken.length,
      tokenPreview: this.expoPushToken.substring(0, 25) + '...',
      platform: Platform.OS,
      fcmAvailable: this.fcmAvailable,
      isLocalDev: !Constants.appOwnership || Constants.appOwnership === 'expo',
    });
  ```

---

## 🧪 Phase 3: Add Debug Tools

### Step 5: Add Database Debug Function

- [ ] **Create debug function in Supabase**
  ```sql
  CREATE OR REPLACE FUNCTION debug_notification_eligibility()
  RETURNS TABLE(
    user_id uuid,
    username text,
    notifications_enabled boolean,
    has_active_tokens boolean,
    token_count bigint,
    most_recent_token_date timestamptz,
    platform_info text
  )
  LANGUAGE sql
  SECURITY DEFINER
  AS $$
    SELECT
      p.id,
      p.username,
      p.notifications_enabled,
      EXISTS(SELECT 1 FROM push_tokens pt WHERE pt.user_id = p.id AND pt.is_active = true) as has_active_tokens,
      COUNT(pt.id) as token_count,
      MAX(pt.created_at) as most_recent_token_date,
      string_agg(DISTINCT pt.platform, ', ') as platform_info
    FROM profiles p
    LEFT JOIN push_tokens pt ON p.id = pt.user_id
    GROUP BY p.id, p.username, p.notifications_enabled
    ORDER BY p.notifications_enabled DESC, token_count DESC;
  $$;
  ```

### Step 6: Add Client-Side Debug Methods

- [ ] **Add debug methods to `notificationService.ts`**

  **Add these methods to the NotificationService class:**

  ```typescript
  /**
   * 🔥 DEBUG: Get detailed status for troubleshooting
   */
  async getDetailedStatus() {
    const { supabaseService } = await import('@/utils/supabaseClient');
    const { getCurrentSession } = await import('./authService');

    const session = await getCurrentSession();
    const basicStatus = this.getStatus();

    let dbTokenCount = 0;
    if (session?.user?.id) {
      try {
        const { data, error } = await supabaseService.getClient()
          .from('push_tokens')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true);

        dbTokenCount = data?.length || 0;
      } catch (error) {
        logger.error('Failed to check database tokens:', error);
      }
    }

    return {
      ...basicStatus,
      userId: session?.user?.id,
      dbTokenCount,
      env: process.env.EXPO_PUBLIC_ENV,
      fcmEnabled: process.env.EXPO_PUBLIC_FCM_ENABLED,
      appOwnership: Constants.appOwnership,
      isLocalDev: !Constants.appOwnership || Constants.appOwnership === 'expo',
    };
  }

  /**
   * 🔥 DEBUG: Force complete re-registration flow
   */
  async debugForceReRegistration(): Promise<boolean> {
    try {
      logger.debug('🔄 Starting debug re-registration...');

      // Clear current token
      this.expoPushToken = null;

      // Check permissions
      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Permissions not granted');
        }
      }

      // Force token registration
      await this.registerPushToken();

      const status = await this.getDetailedStatus();
      logger.debug('🎉 Debug re-registration completed:', status);

      return !!this.expoPushToken;
    } catch (error) {
      logger.error('❌ Debug re-registration failed:', error);
      return false;
    }
  }
  ```

---

## ✅ Phase 4: Testing & Verification

### Step 7: Test the Fix

- [ ] **Test in development environment**

  1. Clear app data/cache
  2. Enable notifications in app settings
  3. Check app logs for successful token registration
  4. Verify token appears in database

- [ ] **Run database verification queries**

  ```sql
  -- Should now show tokens for Android users
  SELECT * FROM debug_notification_eligibility();

  -- Test the notification function directly
  SELECT send_daily_reminders();
  ```

### Step 8: Test on Real Device

- [ ] **Test on Android physical device**

  - Install app on physical Android device
  - Enable notifications
  - Check if token is registered
  - Wait for scheduled notification (or trigger manually)

- [ ] **Test EAS Build**
  - Create EAS build with fixes
  - Test notification flow on EAS build
  - Verify FCM works properly in production build

---

## 🎯 Phase 5: Final Verification

### Step 9: End-to-End Test

- [ ] **Complete notification flow test**

  1. User enables notifications ✓
  2. Token gets registered in database ✓
  3. `send_daily_reminders()` finds eligible users ✓
  4. Notifications are actually sent ✓
  5. User receives notifications ✓

- [ ] **Monitor notification logs**

  ```sql
  -- Check if notifications are being sent
  SELECT * FROM push_notifications ORDER BY created_at DESC LIMIT 10;

  -- Check for any errors
  SELECT * FROM push_notifications WHERE status = 'failed' OR error_message IS NOT NULL;
  ```

### Step 10: Cleanup & Documentation

- [ ] **Remove debug logs** (optional - can keep for production monitoring)
- [ ] **Document the fix** in your codebase
- [ ] **Update team** on the solution

---

## 🚨 Emergency Rollback Plan

If fixes cause issues:

- [ ] **Revert FCM blocking logic** to original state
- [ ] **Add bypass environment variable** to control behavior
- [ ] **Test alternative Expo-only approach** without FCM dependency

---

## 📋 Success Criteria

- ✅ Android users can enable notifications
- ✅ Push tokens are saved to database
- ✅ `send_daily_reminders()` returns > 0
- ✅ Users receive actual notifications
- ✅ No errors in application logs
- ✅ Works in both development and production

---

## 🔧 Quick Commands Reference

```bash
# Clear React Native cache
npx react-native start --reset-cache

# Clear Expo cache
npx expo start -c

# Build EAS preview
eas build --platform android --profile preview
```

```sql
-- Quick database checks
SELECT COUNT(*) FROM push_tokens WHERE is_active = true;
SELECT send_daily_reminders();
SELECT * FROM debug_notification_eligibility();
```
