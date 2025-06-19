# 🚀 EAS Push Notifications Setup Guide

## Overview

This guide walks you through setting up push notifications for your React Native app using EAS (Expo Application Services) and Supabase.

## Prerequisites

- ✅ Expo account
- ✅ EAS CLI installed (`npm install -g @expo/eas-cli`)
- ✅ Supabase project set up
- ✅ App built with Expo/React Native

## Step 1: EAS Project Setup

### 1.1 Login to EAS

```bash
eas login
```

### 1.2 Configure EAS Project

```bash
eas build:configure
```

This will:

- Create an EAS project ID
- Update your `app.config.cjs` with the project ID
- Generate `eas.json` if it doesn't exist

### 1.3 Verify Project ID

Check that your `app.config.cjs` includes:

```javascript
export default {
  expo: {
    // ... other config
    extra: {
      eas: {
        projectId: 'your-project-id-here', // This is crucial for push tokens
      },
    },
  },
};
```

## Step 2: Push Notification Credentials

### 2.1 iOS - Apple Push Notification Service (APNs)

#### Option A: EAS Managed Credentials (Recommended)

```bash
eas credentials
```

- Select your project
- Choose iOS
- Select "Push Notification Service Key"
- Follow prompts to generate/upload credentials

#### Option B: Manual APNs Key

1. Go to [Apple Developer Console](https://developer.apple.com/account/resources/authkeys/list)
2. Create a new key with "Apple Push Notification Service" enabled
3. Download the `.p8` file
4. Upload via EAS:

```bash
eas credentials:configure
```

### 2.2 Android - Firebase Cloud Messaging (FCM)

#### Option A: EAS Managed (Recommended)

```bash
eas credentials
```

- Select Android
- Choose "Google Service Account Key"
- EAS will handle FCM setup automatically

#### Option B: Manual FCM Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your project
3. Go to Project Settings → Cloud Messaging
4. Generate new private key for service account
5. Upload via EAS:

```bash
eas credentials:configure
```

## Step 3: Environment Variables

### 3.1 Add EAS Environment Variables

```bash
eas secret:create --scope project --name EXPO_PUBLIC_EAS_PROJECT_ID --value "your-project-id"
```

### 3.2 Update Your `.env`

```env
# Push Notifications
EXPO_PUBLIC_EAS_PROJECT_ID=your-project-id-here

# Supabase (existing)
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 4: Test Push Token Generation

### 4.1 Build a Development Build

```bash
eas build --platform ios --profile development
eas build --platform android --profile development
```

### 4.2 Install and Test

1. Install the development build on a physical device
2. Run the app and check ToastTester for push token generation
3. Verify token is saved to your Supabase database

### 4.3 Test Notification in Development

Use the debug component to test:

```typescript
// In ToastTester component
const testPushToken = async () => {
  const token = await notificationService.getCurrentPushToken();
  console.log('Current push token:', token);

  if (token) {
    // Send a test notification via your backend
    await notificationService.sendServerNotification(
      'Test Notification',
      'This is a test from your app!',
      { test: true }
    );
  }
};
```

## Step 5: Production Configuration

### 5.1 Update `eas.json` for Production

```json
{
  "cli": {
    "version": ">= 7.8.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENV": "preview"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 5.2 Production Build

```bash
eas build --platform all --profile production
```

## Step 6: Backend Integration

### 6.1 Deploy Supabase Edge Function

```bash
# If you have Supabase CLI set up
npx supabase functions new send-push-notifications
# Copy the edge function code from docs/push-notification-server.ts
npx supabase functions deploy send-push-notifications
```

### 6.2 Set Up Cron Job

Add this to your Supabase cron jobs (or use external service):

```sql
-- Run every minute to check for pending notifications
SELECT cron.schedule(
  'send-push-notifications',
  '* * * * *', -- Every minute
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/send-push-notifications'',
    headers:=''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'',
    body:=''{"batch_size": 100}''
  ) as request_id;'
);
```

### 6.3 Test Daily Reminders

```sql
-- Call this function to test daily reminder system
SELECT send_daily_reminders();

-- Check notification status
SELECT * FROM push_notifications ORDER BY created_at DESC LIMIT 10;
```

## Step 7: Monitoring & Analytics

### 7.1 Monitor Push Delivery

```sql
-- Check delivery rates
SELECT
  notification_type,
  status,
  COUNT(*) as count
FROM push_notifications
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY notification_type, status;
```

### 7.2 Debug Failed Notifications

```sql
-- Check failed notifications
SELECT
  title,
  body,
  error_message,
  created_at
FROM push_notifications
WHERE status = 'failed'
ORDER BY created_at DESC;
```

## Step 8: User Settings Integration

### 8.1 Add Push Settings to Settings Screen

Create a new settings component for push notifications:

```typescript
// In your settings screen
const [pushEnabled, setPushEnabled] = useState(false);

const updatePushSettings = async (enabled: boolean) => {
  const success = await notificationService.updatePushNotificationPreferences(enabled);
  if (success) {
    setPushEnabled(enabled);
  }
};
```

## Troubleshooting

### Common Issues

**1. Push Token is Null**

- Ensure EAS project ID is configured
- Check device permissions
- Verify running on physical device

**2. Notifications Not Received**

- Check Supabase Edge Function logs
- Verify push tokens in database
- Check notification status in push_notifications table

**3. iOS: "Invalid Push Token"**

- Verify APNs credentials in EAS
- Check bundle ID matches
- Ensure production/development environment matches

**4. Android: FCM Errors**

- Verify FCM service account key
- Check package name matches
- Ensure Google Services are enabled

### Testing Checklist

- [ ] Push token generates successfully
- [ ] Token saves to Supabase database
- [ ] Local notifications work
- [ ] Server notifications create database entries
- [ ] Edge function processes notifications
- [ ] Notifications deliver to device
- [ ] Settings allow enabling/disabling
- [ ] Daily reminders work
- [ ] Throwback reminders work

## Production Deployment

1. **Build Production Apps**

   ```bash
   eas build --platform all --profile production
   ```

2. **Submit to App Stores**

   ```bash
   eas submit --platform all
   ```

3. **Enable Monitoring**
   - Set up alerts for failed notifications
   - Monitor delivery rates
   - Track user engagement with notifications

## Cost Considerations

- **Expo Push Notifications**: FREE (unlimited)
- **EAS Build**: $19/month for 30 builds + 1,000 MAUs
- **Supabase Edge Functions**: Included in free tier (up to 500k requests)
- **APNs/FCM**: FREE from Apple/Google

Total estimated cost: $19/month for the EAS service (if you exceed free tier)

## Next Steps

1. Run the database migration in Supabase
2. Set up EAS project and credentials
3. Deploy the edge function
4. Configure cron jobs for scheduled notifications
5. Test thoroughly in development
6. Deploy to production

Your push notification system will be fully functional and scalable! 🎉
