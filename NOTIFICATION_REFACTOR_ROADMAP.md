# 🔔 Notification System Refactoring Roadmap

## 📋 Overview

This document outlines the complete refactoring plan to transform the current complex notification system into a simple, single-toggle solution with fixed notification times.

### 🎯 Goal

Transform from a complex multi-service, multi-UI notification system to a dead-simple single toggle that enables/disables all notifications at fixed times.

### ⏰ Fixed Notification Schedule (GMT+3 - Turkey Time)

- **Daily Gratitude Reminders**: 12:00 and 19:00
- **Throwback Memory Reminders**: 14:00 and 21:00

### 🔑 Key Architecture Decision

**All notifications will be sent server-side via cron jobs** - ensuring they work regardless of app state (killed, background, or foreground).

---

## 🗺️ Step-by-Step Implementation Roadmap

### Phase 1: Backend Simplification

#### Step 1.1: Database Schema Updates

```sql
-- Remove unused columns from profiles table
ALTER TABLE profiles
DROP COLUMN reminder_time,
DROP COLUMN throwback_reminder_time,
DROP COLUMN throwback_reminder_frequency,
DROP COLUMN notification_timezone,
DROP COLUMN last_notification_sent;

-- Rename and simplify
ALTER TABLE profiles
RENAME COLUMN reminder_enabled TO notifications_enabled;

-- Remove throwback_reminder_enabled (consolidated into single toggle)
ALTER TABLE profiles
DROP COLUMN throwback_reminder_enabled;

-- Add token management fields
ALTER TABLE profiles
ADD COLUMN push_token_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN push_notification_failures INT DEFAULT 0;
```

#### Step 1.2: Server Infrastructure Setup

**Critical: Set up server-side cron jobs for notification delivery**

```sql
-- Create 4 cron jobs in Supabase (or your cron service)

-- 1. Morning Daily Reminder - 12:00 GMT+3 (09:00 UTC)
SELECT cron.schedule(
  'daily-reminder-morning',
  '0 9 * * *', -- UTC time
  $$
  SELECT send_push_notifications(
    'daily_reminder',
    '🌟 Minnettarlık zamanı!',
    'Bugün neye minnettarsın? Hemen yaz!'
  );
  $$
);

-- 2. Afternoon Throwback - 14:00 GMT+3 (11:00 UTC)
SELECT cron.schedule(
  'throwback-reminder-afternoon',
  '0 11 * * *',
  $$
  SELECT send_push_notifications(
    'throwback_reminder',
    '💭 Anılarını hatırla!',
    'Geçmiş minnettarlıklarını keşfet'
  );
  $$
);

-- 3. Evening Daily Reminder - 19:00 GMT+3 (16:00 UTC)
SELECT cron.schedule(
  'daily-reminder-evening',
  '0 16 * * *',
  $$
  SELECT send_push_notifications(
    'daily_reminder',
    '🌙 Akşam minnettarlığı!',
    'Günü minnettarlıkla kapat'
  );
  $$
);

-- 4. Night Throwback - 21:00 GMT+3 (18:00 UTC)
SELECT cron.schedule(
  'throwback-reminder-night',
  '0 18 * * *',
  $$
  SELECT send_push_notifications(
    'throwback_reminder',
    '✨ Günün anıları!',
    'Nelere minnettarlık duymuştun? Hemen hatırla!'
  );
  $$
);
```

#### Step 1.3: Create Server Push Function

```sql
-- Function to send push notifications to all enabled users
CREATE OR REPLACE FUNCTION send_push_notifications(
  notification_type TEXT,
  title TEXT,
  body TEXT
) RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get all users with notifications enabled and valid push tokens
  FOR user_record IN
    SELECT id, expo_push_token
    FROM profiles
    WHERE notifications_enabled = true
      AND expo_push_token IS NOT NULL
      AND push_notification_failures < 5 -- Skip users with too many failures
  LOOP
    -- Send via Expo Push API
    PERFORM send_expo_push_notification(
      user_record.expo_push_token,
      title,
      body,
      json_build_object('type', notification_type, 'userId', user_record.id)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

#### Step 1.4: Remove Edge Functions

- Delete `schedule-expo-push` Edge Function
- Delete `send-expo-push` Edge Function
- Remove all Edge Function references

---

### Phase 2: Service Layer Consolidation

#### Step 2.1: Delete Redundant Service

```bash
# Remove the redundant push service
rm src/services/expoPushService.ts
```

#### Step 2.2: Simplify notificationService.ts

Create new simplified service with only essential methods:

```typescript
// src/services/notificationService.ts (simplified to ~200 lines)
class NotificationService {
  private initialized = false;
  private expoPushToken: string | null = null;

  // Core methods only:
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    const permitted = await this.requestPermissions();
    if (permitted) {
      await this.registerPushToken();
    }

    this.initialized = true;
    return permitted;
  }

  async requestPermissions(): Promise<boolean> {
    // Request notification permissions
  }

  async toggleNotifications(enabled: boolean): Promise<boolean> {
    try {
      // Simply update the database field
      const { updateProfile } = await import('@/api/profileApi');
      await updateProfile({ notifications_enabled: enabled });

      // If enabling and we don't have a token yet, get one
      if (enabled && !this.expoPushToken) {
        await this.registerPushToken();
      }

      return true;
    } catch (error) {
      logger.error('Failed to toggle notifications:', error);
      return false;
    }
  }

  private async registerPushToken(): Promise<void> {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = token;

      // Update token in database with timestamp
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { getCurrentSession } = await import('./authService');

      const session = await getCurrentSession();
      if (session?.user) {
        await supabaseService
          .getClient()
          .from('profiles')
          .update({
            expo_push_token: token,
            push_token_updated_at: new Date().toISOString(),
            push_notification_failures: 0, // Reset failures on new token
          })
          .eq('id', session.user.id);
      }
    } catch (error) {
      logger.error('Failed to register push token:', error);
    }
  }

  // Token refresh method (called periodically)
  async refreshTokenIfNeeded(): Promise<void> {
    // Refresh token if older than 30 days
    const { profile } = await import('@/api/profileApi').then((m) => m.getProfile());
    if (profile?.push_token_updated_at) {
      const lastUpdate = new Date(profile.push_token_updated_at);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate > 30) {
        await this.registerPushToken();
      }
    }
  }

  // No local scheduling methods needed - all handled server-side
}
```

---

### Phase 3: UI Simplification

#### Step 3.1: Remove Complex Components

```bash
# Delete redundant UI components
rm src/components/settings/DailyReminderSettings.tsx
rm src/components/settings/ThrowbackReminderSettings.tsx
rm src/features/settings/screens/ReminderSettingsScreen.tsx
```

#### Step 3.2: Create Simple Toggle Component

```typescript
// src/components/settings/NotificationToggle.tsx (~80 lines)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';
import { useTheme } from '@/providers/ThemeProvider';

interface NotificationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  enabled,
  onToggle,
  isLoading
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon
            name="bell-outline"
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Bildirimleri Aç
          </Text>
          <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            Günde 4 hatırlatıcı alacaksınız{'\n'}
            (12:00, 14:00, 19:00, 21:00)
          </Text>
        </View>
      </View>
      <ThemedSwitch
        value={enabled}
        onValueChange={onToggle}
        disabled={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default NotificationToggle;
```

#### Step 3.3: Update SettingsScreen

```typescript
// In SettingsScreen.tsx, replace complex notification sections with:
<ScreenSection title="Bildirimler">
  <NotificationToggle
    enabled={profile?.notifications_enabled ?? false}
    onToggle={handleNotificationToggle}
    isLoading={isUpdatingProfile}
  />
</ScreenSection>

// Handler:
const handleNotificationToggle = async (enabled: boolean) => {
  const success = await notificationService.toggleNotifications(enabled);
  if (success) {
    hapticFeedback.success();
    analyticsService.logEvent('notifications_toggled', { enabled });
  }
};
```

---

### Phase 4: Remove from Onboarding

#### Step 4.1: Update Onboarding Flow

```typescript
// src/features/onboarding/screens/EnhancedOnboardingFlowScreen.tsx
// Remove NotificationSettingsStep from steps array
const steps = [
  WelcomeStep,
  PersonalizationStep,
  GoalSettingStep,
  // NotificationSettingsStep, // REMOVE THIS
  FeatureIntroStep,
  InteractiveDemoStep,
  CompletionStep,
];
```

#### Step 4.2: Delete Onboarding Notification Step

```bash
rm src/features/onboarding/screens/steps/NotificationSettingsStep.tsx
```

#### Step 4.3: Update Navigation

- Remove notification setup route from onboarding navigation
- Update step indices and progress calculations

---

### Phase 5: Schema and API Updates

#### Step 5.1: Update Profile Schema

```typescript
// src/schemas/profileSchema.ts
export const profileSchema = z.object({
  // ... other fields
  notifications_enabled: z.boolean(),
  expo_push_token: z.string().nullable(),
  push_token_updated_at: z.string().nullable(),
  push_notification_failures: z.number(),
  // Remove: reminder_enabled, reminder_time, throwback_* fields
});

export const updateProfileSchema = z.object({
  // ... other fields
  notifications_enabled: z.boolean().optional(),
  // Remove all notification time/frequency fields
});
```

#### Step 5.2: Update TypeScript Types

```typescript
// src/types/supabase.types.ts
// Update generated types after database migration
interface Profile {
  // ... other fields
  notifications_enabled: boolean;
  expo_push_token: string | null;
  push_token_updated_at: string | null;
  push_notification_failures: number;
  // Remove old notification fields
}
```

#### Step 5.3: Update API Layer

```typescript
// src/api/profileApi.ts
// Remove notification time validation/processing
// Simplify to just handle notifications_enabled boolean
```

---

### Phase 6: App.tsx Updates

#### Step 6.1: Simplify Initialization

```typescript
// In App.tsx
useEffect(() => {
  const initNotifications = async () => {
    if (notificationService.isInitialized()) return;

    try {
      await notificationService.initialize();

      // No need for complex restoration - server handles scheduling
      // Just ensure token is registered if notifications are enabled
      if (profile?.notifications_enabled) {
        await notificationService.refreshTokenIfNeeded();
      }
    } catch (error) {
      logger.error('Notification init failed:', error);
    }
  };

  initNotifications();
}, [profile?.notifications_enabled]);
```

#### Step 6.2: Add Token Refresh Timer

```typescript
// Periodically refresh push tokens to ensure they're valid
useEffect(() => {
  const refreshInterval = setInterval(
    async () => {
      if (profile?.notifications_enabled) {
        await notificationService.refreshTokenIfNeeded();
      }
    },
    24 * 60 * 60 * 1000
  ); // Daily

  return () => clearInterval(refreshInterval);
}, [profile?.notifications_enabled]);
```

#### Step 6.3: Keep Navigation Handlers

- Maintain notification tap handlers for navigation
- Keep deep link handling as-is

---

### Phase 7: Testing & Cleanup

#### Step 7.1: Remove Debug/Test Components

- Remove notification testing from ToastTester
- Remove test notification features

#### Step 7.2: Update Analytics

```typescript
// Simplify analytics events to:
analyticsService.logEvent('notifications_toggled', { enabled: boolean });
// Remove all time/frequency related analytics
```

#### Step 7.3: Server Monitoring Setup

```sql
-- Create monitoring table for notification delivery
CREATE TABLE notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  notification_type TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN,
  error_message TEXT,
  expo_ticket_id TEXT
);

-- Function to log notification attempts
CREATE OR REPLACE FUNCTION log_notification_attempt(
  p_user_id UUID,
  p_notification_type TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_expo_ticket_id TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO notification_logs (user_id, notification_type, success, error_message, expo_ticket_id)
  VALUES (p_user_id, p_notification_type, p_success, p_error_message, p_expo_ticket_id);

  -- Update failure count if failed
  IF NOT p_success THEN
    UPDATE profiles
    SET push_notification_failures = push_notification_failures + 1
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 Implementation Order

### Week 1: Backend First

1. **Day 1-2**: Database migration (Step 1.1)
2. **Day 3**: Server infrastructure setup (Step 1.2)
3. **Day 4**: Create push function (Step 1.3)
4. **Day 5**: Test cron jobs and monitoring

### Week 2: Service Layer

1. **Day 1**: Delete expoPushService.ts (Step 2.1)
2. **Day 2-4**: Refactor notificationService.ts (Step 2.2)
3. **Day 5**: Test service layer changes

### Week 3: Frontend

1. **Day 1**: Remove old UI components (Step 3.1)
2. **Day 2**: Create NotificationToggle (Step 3.2)
3. **Day 3**: Update SettingsScreen (Step 3.3)
4. **Day 4**: Remove from onboarding (Step 4.1-4.3)
5. **Day 5**: Update schemas and types (Step 5.1-5.3)

### Week 4: Polish & Test

1. **Day 1-2**: App.tsx updates (Step 6.1-6.3)
2. **Day 3**: Server monitoring setup (Step 7.3)
3. **Day 4**: Final testing
4. **Day 5**: Production deployment

---

## ✅ Success Criteria

1. **Single Toggle**: Only one notification switch in settings
2. **Fixed Times**: Notifications sent at exact times (12:00, 14:00, 19:00, 21:00 GMT+3)
3. **Force Kill Resilient**: Notifications work even when app is killed
4. **Persistent Preferences**: Settings survive app restarts
5. **No Configuration**: Users cannot customize times or frequency
6. **Simplified Codebase**: ~80% reduction in notification-related code
7. **No Onboarding Step**: Notifications not mentioned during onboarding
8. **Reliable Delivery**: Server-side delivery with monitoring

---

## 🎯 End State

### User Experience:

1. User goes to Settings
2. Sees "Notifications" section with single toggle
3. Toggle ON = 4 daily notifications at fixed times
4. Toggle OFF = No notifications
5. Notifications work regardless of app state

### Technical State:

- 1 service file (~200 lines vs current 1,200+)
- 1 UI component (~80 lines vs current 1,300+)
- 1 database field for preference (+ 3 for token management)
- 0 Edge Functions (vs current 2)
- 4 server-side cron jobs
- Complete monitoring and logging

---

## ⚠️ Migration Considerations

1. **Existing Users**:

   - If ANY notification was enabled → Set `notifications_enabled = true`
   - Preserve existing expo_push_token values
   - Send in-app announcement about simplified notifications

2. **Data Backup**:

   ```sql
   -- Backup old preferences before deletion
   CREATE TABLE notification_preferences_backup AS
   SELECT id, reminder_enabled, reminder_time, throwback_reminder_enabled,
          throwback_reminder_frequency, throwback_reminder_time
   FROM profiles;
   ```

3. **Server Infrastructure**:

   - Set up 4 cron jobs with proper error handling
   - Implement retry logic for failed notifications
   - Monitor server load during notification sends
   - Set up alerts for high failure rates

4. **Push Token Management**:

   - Implement token refresh mechanism
   - Handle expired tokens gracefully
   - Clean up tokens for users who uninstall

5. **Testing Strategy**:
   - Test with app in all states (foreground, background, killed)
   - Verify timezone handling for users outside Turkey
   - Load test with full user base
   - Test token expiration scenarios

---

## 📊 Expected Impact

- **Code Reduction**: ~1,500 lines removed
- **Complexity**: 90% reduction
- **User Confusion**: Eliminated
- **Maintenance**: Minimal
- **Reliability**: Maximum (server-side delivery)
- **Cost**: Minimal increase in server processing

---

## 🎯 End State

### User Experience:

1. User goes to Settings
2. Sees "Notifications" section with single toggle
3. Toggle ON = 4 daily notifications at fixed times
4. Toggle OFF = No notifications
5. Notifications work regardless of app state

### Technical State:

- 1 service file (~200 lines vs current 1,200+)
- 1 UI component (~80 lines vs current 1,300+)
- 1 database field for preference (+ 3 for token management)
- 0 Edge Functions (vs current 2)
- 4 server-side cron jobs
- Complete monitoring and logging

---

## ⚠️ Migration Considerations

1. **Existing Users**:

   - If ANY notification was enabled → Set `notifications_enabled = true`
   - Preserve existing expo_push_token values
   - Send in-app announcement about simplified notifications

2. **Data Backup**:

   ```sql
   -- Backup old preferences before deletion
   CREATE TABLE notification_preferences_backup AS
   SELECT id, reminder_enabled, reminder_time, throwback_reminder_enabled,
          throwback_reminder_frequency, throwback_reminder_time
   FROM profiles;
   ```

3. **Server Infrastructure**:

   - Set up 4 cron jobs with proper error handling
   - Implement retry logic for failed notifications
   - Monitor server load during notification sends
   - Set up alerts for high failure rates

4. **Push Token Management**:

   - Implement token refresh mechanism
   - Handle expired tokens gracefully
   - Clean up tokens for users who uninstall

5. **Testing Strategy**:
   - Test with app in all states (foreground, background, killed)
   - Verify timezone handling for users outside Turkey
   - Load test with full user base
   - Test token expiration scenarios

---

## 📊 Expected Impact

- **Code Reduction**: ~1,500 lines removed
- **Complexity**: 90% reduction
- **User Confusion**: Eliminated
- **Maintenance**: Minimal
- **Reliability**: Maximum (server-side delivery)
- **Cost**: Minimal increase in server processing
