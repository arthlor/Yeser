# 🔐 Authentication Flow Testing Guide

This guide helps you thoroughly test magic link authentication in production builds before submitting to app stores.

## 🚨 Critical Tests (Based on Past Issues)

### 1. Splash Screen Hanging Test

**Issue**: Production APK hangs on splash screen due to expo-dev-client import
**Test**:

- Open production build
- App should load completely within 10 seconds
- Should NOT hang on splash screen indefinitely
- Should reach login screen or main app (if authenticated)

### 2. Magic Link Authentication Flow

**Test Scenario**: Complete end-to-end authentication

#### Step 1: Initial Login

1. Open production build
2. Navigate to login screen
3. Enter valid email address
4. Tap "Magic Link Gönder" button
5. Verify success message appears
6. Check email inbox for magic link

#### Step 2: Magic Link Handling

1. Open magic link email on same device
2. Tap the magic link
3. **Critical**: App should open automatically
4. App should navigate to authenticated state
5. User should be logged in successfully

#### Step 3: Deep Link Validation

Test the deep link scheme: `yeser://auth/callback`

```bash
# Test deep link manually (Android)
adb shell am start -W -a android.intent.action.VIEW -d "yeser://auth/callback?access_token=test&refresh_token=test" com.your.package.name

# Test deep link manually (iOS Simulator)
xcrun simctl openurl booted "yeser://auth/callback?access_token=test&refresh_token=test"
```

### 3. Google OAuth Testing

**Test Scenario**: Alternative authentication method

1. Tap "Google ile Giriş" button
2. Google sign-in flow should open
3. Complete Google authentication
4. App should return and authenticate user
5. User should be logged in successfully

## 🧪 Production-Specific Tests

### Environment Variable Validation

Verify these are properly set in production:

```bash
# Check these are available in production build
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_APP_NAME
```

### Network Connectivity Tests

1. **Online Authentication**: Test with strong internet
2. **Slow Network**: Test with slow/intermittent connection
3. **Offline Behavior**: Test app behavior when offline
4. **Network Recovery**: Test app recovery when connection restored

### Performance Tests

1. **Memory Usage**: Monitor RAM usage during auth flows
2. **CPU Usage**: Check for excessive CPU usage
3. **Battery Impact**: Monitor battery drain during testing
4. **App Size**: Verify installed app size is reasonable

## 🐛 Common Issues & Solutions

### Issue: Magic Link Opens Browser Instead of App

**Symptoms**: Magic link opens in browser, doesn't return to app
**Solution**: Check deep link scheme configuration in app.config.js

```javascript
scheme: "yeser",
```

### Issue: Authentication State Not Persisting

**Symptoms**: User logged out on app restart
**Solution**: Check AsyncStorage permissions and Supabase session handling

### Issue: Supabase Connection Errors

**Symptoms**: Network errors, failed API calls
**Solution**: Verify Supabase URL and anon key in production environment

### Issue: Google OAuth Failures

**Symptoms**: Google sign-in fails or errors
**Solution**: Check Google OAuth configuration and bundle ID

## 📱 Device-Specific Testing

### Android Testing Checklist

- [ ] Test on Android 8+ (minimum supported version)
- [ ] Test with different screen sizes
- [ ] Test deep link handling from email apps
- [ ] Test with different keyboards
- [ ] Test with accessibility features enabled
- [ ] Test with different system languages

### iOS Testing Checklist

- [ ] Test on iOS 13+ (minimum supported version)
- [ ] Test with different screen sizes
- [ ] Test deep link handling from Mail app
- [ ] Test with VoiceOver enabled
- [ ] Test with different system languages
- [ ] Test with reduced motion enabled

## 🔄 End-to-End Test Script

Run this complete test sequence before submitting to EAS Build:

```bash
# 1. Validate production build
node scripts/validate-production.js

# 2. Build and install production app
chmod +x scripts/test-production-builds.sh
./scripts/test-production-builds.sh

# 3. Manual authentication testing
# - Complete magic link flow
# - Test Google OAuth
# - Test app state persistence
# - Test deep link handling

# 4. Performance testing
# - Monitor memory usage
# - Check for crashes
# - Test network error handling

# 5. Final validation
# If all tests pass, ready for EAS Build!
```

## 📊 Success Criteria

Your app is ready for EAS Build when:

- ✅ No splash screen hanging (app loads completely)
- ✅ Magic link authentication works end-to-end
- ✅ Deep links open app correctly
- ✅ Google OAuth functions properly
- ✅ Authentication state persists across app restarts
- ✅ No memory leaks or crashes during testing
- ✅ App performs well on target devices
- ✅ Network error handling works correctly
- ✅ All critical user flows function properly

## 🚨 Red Flags (Do NOT Submit)

Stop and fix if you see:

- ❌ App hangs on splash screen
- ❌ Magic links don't open the app
- ❌ Authentication fails silently
- ❌ App crashes during auth flows
- ❌ Memory usage grows continuously
- ❌ Network errors aren't handled gracefully
- ❌ Deep links open browser instead of app

## 📞 Debugging Production Issues

### Enable Debug Logging

Add this to your production testing build (remove before final submission):

```typescript
// In your auth service
console.log('Auth state:', { isAuthenticated, user: user?.email });
console.log('Deep link received:', { url, tokens });
```

### Network Monitoring

Use these tools to monitor network calls:

- **Android**: Chrome DevTools + Remote Debugging
- **iOS**: Safari Web Inspector
- **Both**: React Native Flipper (if configured)

### Error Tracking

Monitor these console outputs during testing:

- Authentication errors
- Network failures
- Deep link handling errors
- Supabase connection issues

---

**Remember**: Thorough testing here saves you EAS Build quota and prevents app store rejections!
