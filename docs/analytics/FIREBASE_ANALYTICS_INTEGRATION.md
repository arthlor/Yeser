# Yeşer - Firebase & Google Analytics 4 Integration

## 1. Introduction

This document details the integration of Firebase and Google Analytics 4 (GA4) into the Yeşer application. Analytics are crucial for understanding user behavior, tracking feature adoption, and identifying areas for improvement. We use the `@react-native-firebase/analytics` library for this purpose.

## 2. Firebase Project Setup

### 2.1. Firebase Project
*   A Firebase project is essential. For Yeşer, the project is named **Yeser** (Project ID: `yeser-2b816`).

### 2.2. Registering Applications
*   **Android App:**
    *   Registered with package name: `com.arthlor.yeser`.
    *   `google-services.json` file downloaded from Firebase console.
*   **iOS App:**
    *   Registered with bundle ID: `com.anilkaraca.yeser` (or the actual bundle ID used).
    *   `GoogleService-Info.plist` file downloaded from Firebase console.

## 3. Installation & Native Configuration

### 3.1. Install Firebase Libraries
Install the necessary `@react-native-firebase` packages:
```bash
npm install @react-native-firebase/app @react-native-firebase/analytics
# or
yarn add @react-native-firebase/app @react-native-firebase/analytics
```

### 3.2. Android Configuration
1.  **`google-services.json`:** Place the downloaded `google-services.json` file in the `android/app/` directory.
2.  **`android/build.gradle` (Project-level):** Add the Google Services plugin classpath:
    ```gradle
    buildscript {
        dependencies {
            // ...other dependencies
            classpath 'com.google.gms:google-services:4.4.1' // Use the latest compatible version
        }
    }
    ```
3.  **`android/app/build.gradle` (App-level):** Apply the Google Services plugin:
    ```gradle
    apply plugin: 'com.android.application'
    apply plugin: 'com.google.gms.google-services' // Add this line
    ```
    Ensure Firebase BoM (Bill of Materials) is included if managing native dependencies, though `@react-native-firebase` usually handles this.

### 3.3. iOS Configuration
1.  **`GoogleService-Info.plist`:** Place the downloaded `GoogleService-Info.plist` file into the `ios/<YourProjectName>/` directory. Then, within Xcode, right-click on your project's name in the Project Navigator, select "Add Files to <YourProjectName>...", and add the `GoogleService-Info.plist` file. Ensure it's added to all relevant targets.
2.  **CocoaPods:** Add the Firebase pods to your `ios/Podfile`:
    ```ruby
    # Add these lines within your target section
    pod 'Firebase/CoreOnly', :modular_headers => true
    pod 'Firebase/Analytics', :modular_headers => true
    # Add other Firebase pods as needed (e.g., Auth, Crashlytics)
    ```
    Then run `pod install --repo-update` from the `ios` directory.
3.  **Initialize Firebase:** In your `ios/<YourProjectName>/AppDelegate.mm` (or `.m` if not using Objective-C++):
    ```objectivec
    #import <Firebase.h>

    - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
      // ... other setup code
      if ([FIRApp defaultApp] == nil) {
        [FIRApp configure];
      }
      // ... rest of the method
      return YES;
    }
    ```
    *Note: `@react-native-firebase/app` often handles automatic initialization, but explicitly calling `[FIRApp configure];` is a good practice to ensure it's done early.* 

## 4. `analyticsService.ts` Implementation

A dedicated service encapsulates analytics logic, promoting modularity and ease of use.

```typescript
// src/services/analyticsService.ts
import analytics, {
  FirebaseAnalyticsTypes,
} from '@react-native-firebase/analytics';

const logScreenView = async (screenName: string): Promise<void> => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName, // Typically the same as screen_name for RN
    });
  } catch (error) {
    console.error('AnalyticsService: Failed to log screen view', { screenName, error });
  }
};

const logEvent = async (
  eventName: string,
  params?: FirebaseAnalyticsTypes.Module['logEventParams'],
): Promise<void> => {
  try {
    await analytics().logEvent(eventName, params);
  } catch (error) {
    console.error('AnalyticsService: Failed to log event', { eventName, params, error });
  }
};

const setUserId = async (userId: string | null): Promise<void> => {
  try {
    await analytics().setUserId(userId);
  } catch (error) {
    console.error('AnalyticsService: Failed to set user ID', { userId, error });
  }
};

const setUserProperties = async (
  properties: FirebaseAnalyticsTypes.Module['setUserPropertiesParams'] | null,
): Promise<void> => {
  try {
    if (properties === null) {
      // To clear properties, set them to null individually if API requires, or handle as per library specifics.
      // For @R signéNFirebase, setting a property to null effectively clears it.
      // This example assumes you pass an object of properties to set or nullify.
      // Check library docs for exact behavior of passing null for the whole object.
      // It's safer to set individual properties to null, e.g., { user_property_to_clear: null }
      await analytics().setUserProperties(properties as any); // Cast if necessary for null
    } else {
      await analytics().setUserProperties(properties);
    }
  } catch (error) {
    console.error('AnalyticsService: Failed to set user properties', { properties, error });
  }
};

// Optional: Log app open event, often handled automatically by Firebase but can be explicit.
const logAppOpen = async (): Promise<void> => {
  try {
    await analytics().logAppOpen();
  } catch (error) {
    console.error('AnalyticsService: Failed to log app_open event', error);
  }
};

export const analyticsService = {
  logScreenView,
  logEvent,
  setUserId,
  setUserProperties,
  logAppOpen,
};
```

## 5. Key Events Tracked

Below is a list of key events tracked in Yeşer, along with their typical parameters.

*   **Screen Views:**
    *   Event Name: `screen_view` (logged via `logScreenView`)
    *   Parameter: `screen_name` (e.g., `SplashScreen`, `LoginScreen`, `DailyEntryScreen`, `PastEntriesScreen`, `SettingsScreen`, `GratitudeDetailScreen`, `OnboardingWizardScreen`)
*   **Authentication Events:**
    *   `login`: params: `{ method: 'google' | 'email' }`
    *   `signup`: params: `{ method: 'email' }`
    *   `logout`
    *   `password_reset_request`
*   **Gratitude Entry Events:**
    *   `gratitude_entry_add`
    *   `gratitude_entry_view_detail`
    *   `gratitude_entry_edit`
    *   `gratitude_entry_delete`
*   **Settings & Preference Changes:**
    *   `reminder_time_set`: params: `{ time: 'HH:MM' }`
    *   `reminder_toggle`: params: `{ enabled: boolean }`
    *   `theme_changed`: params: `{ theme: 'light' | 'dark' | 'system' }`
    *   `throwback_reminder_toggle`: params: `{ enabled: boolean }`
    *   `throwback_frequency_set`: params: `{ frequency: 'daily' | 'weekly' | 'disabled' }`
*   **Onboarding Events:**
    *   `onboarding_step_complete`: params: `{ step_name: 'welcome' | 'notifications' | 'reminders' }`
    *   `onboarding_complete`
*   **Feature Usage:**
    *   `throwback_entry_viewed`
    *   `streak_calculated`: params: `{ streak_length: number }` (logged when streak info is displayed or updated)
    *   `calendar_month_viewed`: params: `{ month: 'YYYY-MM' }`
*   **Milestone Events (Conceptual):**
    *   `milestone_achieved`: params: `{ milestone_type: 'streak_days' | 'total_entries', value: number }`

## 6. Debugging with Firebase DebugView

DebugView allows you to see your analytics events in real-time in the Firebase console.

*   **Android:**
    1.  Enable debug mode: `adb shell setprop debug.firebase.analytics.app com.arthlor.yeser` (replace with your package name if different).
    2.  Run the app on a device or emulator.
    3.  Events should appear in Firebase Console > DebugView.
    4.  Disable debug mode: `adb shell setprop debug.firebase.analytics.app .none.`
*   **iOS:**
    1.  In Xcode, select Product > Scheme > Edit Scheme.
    2.  Select "Run" from the left menu, then the "Arguments" tab.
    3.  Add `-FIRAnalyticsDebugEnabled` to the "Arguments Passed On Launch" section.
    4.  Run the app on a device or simulator.
    5.  Events should appear in DebugView.
    6.  Remove the launch argument to disable debug mode.

## 7. Data Privacy & User Consent

*   Analytics data is collected to understand app usage patterns and improve the Yeşer experience. This data is aggregated and does not identify users personally beyond the `user_id` set for tracking their own activity patterns.
*   Yeşer's Privacy Policy should inform users about the collection and use of analytics data.
*   No sensitive personal information (beyond what's necessary for core app function and explicitly provided by the user) is tracked as custom event parameters.

This comprehensive setup ensures that Yeşer can effectively leverage Google Analytics 4 for insights while respecting user privacy.
- [ ] **Thoroughly Test Analytics on Both Platforms:** Android DebugView testing confirmed basic event logging. Once iOS is set up and the text rendering error is resolved, test all analytics events (app_open, screen_view, custom events) comprehensively on both Android and iOS, including outside of DebugView if necessary.
- [ ] **Address other Firebase Service Deprecations:** If other Firebase services (e.g., Auth) are used, check for and address any deprecation warnings by migrating to the modular API.
- [ ] **Review and Refine Event Logging:** Ensure all critical user interactions are covered by analytics events.
- [ ] Consider adding Firebase Crashlytics for crash reporting.
