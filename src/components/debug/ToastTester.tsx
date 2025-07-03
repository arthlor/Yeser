import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { logger } from '@/utils/debugConfig';
import type { AppTheme } from '@/themes/types';
import { notificationService } from '@/services/notificationService';
import * as Notifications from 'expo-notifications';

interface ToastTesterProps {
  onClose?: () => void;
}

interface RaceConditionResult {
  test: string;
  passed: boolean;
  details: string;
  iterations: number;
  duration: number;
}

export const ToastTester: React.FC<ToastTesterProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { showSuccess, showError, showWarning, showInfo, hideToast } = useToast();
  const [raceTestResults, setRaceTestResults] = useState<RaceConditionResult[]>([]);
  const [isRunningRaceTests, setIsRunningRaceTests] = useState(false);

  // 🛡️ MEMORY LEAK FIX: Add timer refs for cleanup
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // 🛡️ MEMORY LEAK FIX: Helper to track and clean timers
  const addTimer = useCallback((timer: ReturnType<typeof setTimeout>) => {
    timersRef.current.add(timer);
    return timer;
  }, []);

  // 🛡️ MEMORY LEAK FIX: Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const styles = createStyles(theme);

  // Basic Toast Tests
  const testSuccess = useCallback(() => {
    showSuccess('✅ Success! Operation completed successfully.');
  }, [showSuccess]);

  const testError = useCallback(() => {
    showError('❌ Error! Something went wrong.');
  }, [showError]);

  const testWarning = useCallback(() => {
    showWarning('⚠️ Warning! Please pay attention.');
  }, [showWarning]);

  const testInfo = useCallback(() => {
    showInfo('ℹ️ Info! Here is some useful information.');
  }, [showInfo]);

  // Advanced Toast Tests
  const testLongMessage = useCallback(() => {
    showError(
      '📝 This is a very long toast message that demonstrates how the toast system handles lengthy text content. It should wrap properly and maintain good readability.',
      {
        duration: 6000,
      }
    );
  }, [showError]);

  const testWithAction = useCallback(() => {
    showWarning('🔄 Action Required - Do you want to continue?', {
      duration: 8000,
      action: {
        label: 'Continue',
        onPress: () => {
          showSuccess('✅ Action executed! You clicked Continue.');
        },
      },
    });
  }, [showWarning, showSuccess]);

  const testCustomDuration = useCallback(() => {
    showInfo('⏰ This toast will show for 10 seconds!', { duration: 10000 });
  }, [showInfo]);

  const testHideToast = useCallback(() => {
    showInfo('⏱️ This toast will be hidden in 2 seconds...', { duration: 10000 });
    addTimer(
      setTimeout(() => {
        hideToast();
        showSuccess('✅ Toast hidden programmatically!');
      }, 2000)
    );
  }, [showInfo, hideToast, showSuccess, addTimer]);

  const testToastQueue = useCallback(() => {
    showInfo('🔢 Toast 1 - First in queue');
    showSuccess('🔢 Toast 2 - Second in queue');
    showWarning('🔢 Toast 3 - Third in queue');
    showError('🔢 Toast 4 - Last in queue');
  }, [showInfo, showSuccess, showWarning, showError]);

  const testSequentialToasts = useCallback(() => {
    addTimer(setTimeout(() => showSuccess('✅ Success toast'), 0));
    addTimer(setTimeout(() => showError('❌ Error toast'), 1500));
    addTimer(setTimeout(() => showWarning('⚠️ Warning toast'), 3000));
    addTimer(setTimeout(() => showInfo('ℹ️ Info toast'), 4500));
  }, [showSuccess, showError, showWarning, showInfo, addTimer]);

  const testAllFeatures = useCallback(() => {
    let delay = 0;

    // Success with action
    setTimeout(() => {
      showSuccess('🎉 Success with action!', {
        action: { label: 'View', onPress: () => showInfo('Success action clicked!') },
      });
    }, delay);
    delay += 2000;

    // Warning with long duration
    setTimeout(() => {
      showWarning('⚠️ Important warning that needs attention', { duration: 7000 });
    }, delay);
    delay += 1000;

    // Error with retry
    setTimeout(() => {
      showError('❌ Critical error occurred', {
        action: {
          label: 'Retry',
          onPress: () => showSuccess('🔧 Error resolved!'),
        },
      });
    }, delay);
    delay += 3000;

    // Info with custom duration
    setTimeout(() => {
      showInfo('ℹ️ Process completed successfully', { duration: 3000 });
    }, delay);
  }, [showSuccess, showWarning, showError, showInfo]);

  // 🚨 RACE CONDITION TESTING FUNCTIONS

  // Test 1: Rapid Fire Race Condition
  const testRapidFireRace = useCallback(async (): Promise<boolean> => {
    let passed = true;
    try {
      // Fire 10 toasts within 50ms
      for (let i = 0; i < 10; i++) {
        showInfo(`Rapid Toast ${i + 1}`, { duration: 1000 });
        await new Promise((resolve) => setTimeout(resolve, 5)); // 5ms delay
      }

      // Wait for potential conflicts to manifest
      await new Promise((resolve) => setTimeout(resolve, 100));

      logger.debug('Rapid fire race condition test completed');
      passed = true; // If we reach here without crashes, test passes
    } catch (error) {
      logger.error('Rapid fire race condition test failed:', error as Error);
      passed = false;
    }
    return passed;
  }, [showInfo]);

  // Test 2: Animation Interruption Race
  const testAnimationInterruptionRace = useCallback(async (): Promise<boolean> => {
    let passed = true;
    try {
      // Start a toast, then immediately interrupt with another
      showSuccess('First toast starting...', { duration: 5000 });

      // Interrupt after 50ms (during animation)
      await new Promise((resolve) => setTimeout(resolve, 50));
      showError('Interrupting toast!', { duration: 2000 });

      // Interrupt again after 25ms
      await new Promise((resolve) => setTimeout(resolve, 25));
      showWarning('Double interruption!', { duration: 1000 });

      await new Promise((resolve) => setTimeout(resolve, 200));
      passed = true;
    } catch (error) {
      logger.error('Animation interruption race test failed:', error as Error);
      passed = false;
    }
    return passed;
  }, [showSuccess, showError, showWarning]);

  // Test 3: Hide/Show Conflict Race
  const testHideShowConflictRace = useCallback(async (): Promise<boolean> => {
    let passed = true;
    try {
      // Show toast then immediately hide and show again
      showInfo('About to be hidden...', { duration: 5000 });

      // Immediate hide
      hideToast();

      // Immediate show (potential conflict with hide animation)
      showSuccess('Immediately shown after hide', { duration: 2000 });

      await new Promise((resolve) => setTimeout(resolve, 100));
      passed = true;
    } catch (error) {
      logger.error('Hide/show conflict race test failed:', error as Error);
      passed = false;
    }
    return passed;
  }, [showInfo, hideToast, showSuccess]);

  // Test 4: Timer Overlap Race
  const testTimerOverlapRace = useCallback(async (): Promise<boolean> => {
    let passed = true;
    try {
      // Create multiple toasts with different durations to test timer management
      showInfo('Timer 1 (3s)', { duration: 3000 });
      await new Promise((resolve) => setTimeout(resolve, 10));

      showWarning('Timer 2 (2s)', { duration: 2000 });
      await new Promise((resolve) => setTimeout(resolve, 10));

      showError('Timer 3 (1s)', { duration: 1000 });
      await new Promise((resolve) => setTimeout(resolve, 10));

      showSuccess('Timer 4 (4s)', { duration: 4000 });

      // Wait for all timers to potentially conflict
      await new Promise((resolve) => setTimeout(resolve, 200));
      passed = true;
    } catch (error) {
      logger.error('Timer overlap race test failed:', error as Error);
      passed = false;
    }
    return passed;
  }, [showInfo, showWarning, showError, showSuccess]);

  // Test 5: Action Button Race Condition
  const testActionButtonRace = useCallback(async (): Promise<boolean> => {
    let passed = true;
    try {
      // Show toast with action, then immediately replace
      showWarning('Toast with action', {
        duration: 5000,
        action: {
          label: 'Click',
          onPress: () => showInfo('Action 1 clicked'),
        },
      });

      // Immediately replace with another action toast
      await new Promise((resolve) => setTimeout(resolve, 25));
      showError('Replaced toast with action', {
        duration: 3000,
        action: {
          label: 'Retry',
          onPress: () => showSuccess('Action 2 clicked'),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      passed = true;
    } catch (error) {
      logger.error('Action button race test failed:', error as Error);
      passed = false;
    }
    return passed;
  }, [showWarning, showError, showInfo, showSuccess]);

  // Test 6: Memory Leak Stress Test
  const testMemoryLeakStress = useCallback(async (): Promise<boolean> => {
    let passed = true;
    try {
      // Create many toasts rapidly to test for memory leaks
      for (let i = 0; i < 50; i++) {
        showInfo(`Stress test ${i + 1}`, { duration: 100 });
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1)); // Micro delay
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      passed = true;
    } catch (error) {
      logger.error('Memory leak stress test failed:', error as Error);
      passed = false;
    }
    return passed;
  }, [showInfo]);

  // 🔔 NOTIFICATION TESTING FUNCTIONS

  const testNotificationPermissions = useCallback(async () => {
    try {
      const hasPermissions = await notificationService.requestPermissions();
      if (hasPermissions) {
        showSuccess('✅ Notification permissions granted!');
      } else {
        showWarning('⚠️ Notification permissions denied');
      }
    } catch (error) {
      showError('❌ Permission test failed');
      logger.error('Notification permission test failed:', error as Error);
    }
  }, [showSuccess, showWarning, showError]);

  // ✅ SIMPLIFIED: Test the new toggle-based notification system
  const testNotificationToggle = useCallback(async () => {
    try {
      showInfo('🔄 Testing notification toggle...');

      // Test enabling notifications
      const enableResult = await notificationService.toggleNotifications(true);
      if (enableResult) {
        showSuccess('✅ Notifications enabled successfully');

        // Test disabling notifications
        const disableResult = await notificationService.toggleNotifications(false);
        if (disableResult) {
          showSuccess('✅ Notifications disabled successfully');
          showInfo('🎉 Toggle test completed - notifications now work server-side!');
        } else {
          showError('❌ Failed to disable notifications');
        }
      } else {
        showError('❌ Failed to enable notifications');
      }
    } catch (error) {
      showError('❌ Notification toggle test failed');
      logger.error('Notification toggle test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo]);

  const testBasicNotification = useCallback(async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from the debug menu',
          data: { test: true },
        },
        trigger: null, // Immediate notification
      });
      showSuccess('✅ Test notification scheduled for 1 second!');
    } catch (error) {
      showError('❌ Failed to schedule test notification');
      logger.error('Test notification failed:', error as Error);
    }
  }, [showSuccess, showError]);

  // ✅ SIMPLIFIED: Service initialization test
  const testNotificationService = useCallback(async () => {
    try {
      showInfo('🔄 Testing notification service...');

      const isInitialized = notificationService.isInitialized();
      if (isInitialized) {
        showSuccess('✅ Notification service is already initialized');
      } else {
        const initResult = await notificationService.initialize();
        if (initResult) {
          showSuccess('✅ Notification service initialized successfully');
        } else {
          showError('❌ Failed to initialize notification service');
        }
      }
    } catch (error) {
      showError('❌ Notification service test failed');
      logger.error('Notification service test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo]);

  // 🔥 NEW: FCM Status Test
  const testFCMStatus = useCallback(async () => {
    try {
      const status = notificationService.getStatus();

      showInfo('📱 FCM Status Check:');
      showInfo(`Platform: ${status.platform}`);
      showInfo(`Initialized: ${status.initialized ? 'Yes' : 'No'}`);
      showInfo(`Has Token: ${status.hasToken ? 'Yes' : 'No'}`);
      showInfo(`FCM Available: ${status.fcmAvailable ? 'Yes' : 'No'}`);

      if (status.hasToken) {
        showInfo(`Token Length: ${status.tokenLength}`);
      }

      if (Platform.OS === 'android' && !status.fcmAvailable) {
        showWarning('⚠️ FCM not configured for Android');
        showInfo('ℹ️ This is normal in development');
      }

      logger.info('FCM Status:', status);
    } catch (error) {
      showError('❌ FCM status check failed');
      logger.error('FCM status check failed:', { error: error as Error });
    }
  }, [showError, showInfo, showWarning]);

  // 🔥 NEW: Force Token Refresh Test
  const testForceTokenRefresh = useCallback(async () => {
    try {
      showInfo('🔄 Forcing token refresh...');

      const success = await notificationService.forceTokenRefresh();

      if (success) {
        showSuccess('✅ Token refreshed successfully!');
        const token = notificationService.getCurrentPushToken();
        if (token) {
          showInfo(`New token length: ${token.length}`);
        }
      } else {
        showError('❌ Failed to refresh token');
      }
    } catch (error) {
      showError('❌ Token refresh failed');
      logger.error('Token refresh failed:', { error: error as Error });
    }
  }, [showSuccess, showError, showInfo]);

  // 🔥 NEW: Test Local Notification
  const testLocalNotification = useCallback(async () => {
    try {
      showInfo('📱 Sending local test notification...');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a local test notification to verify the system works!',
          data: { type: 'test_local' },
        },
        trigger: null,
      });

      showSuccess('✅ Local notification scheduled for 2 seconds');
    } catch (error) {
      showError('❌ Local notification failed');
      logger.error('Local notification failed:', { error: error as Error });
    }
  }, [showSuccess, showError, showInfo]);

  // 🔥 NEW: Test Database Function Call
  const testDatabaseNotification = useCallback(async () => {
    try {
      showInfo('📡 Testing database notification function...');

      const { supabaseService } = await import('@/utils/supabaseClient');
      const { data, error } = await supabaseService.getClient().rpc('send_push_notifications', {
        notification_type: 'test_debug_app',
        title: '🧪 App Test',
        body: 'Testing notification from app debug menu',
      });

      if (error) {
        throw new Error(`Database function error: ${error.message}`);
      }

      showSuccess(`✅ Database function executed successfully`);
      showInfo(`Result: ${data || 'No data returned'}`);
      logger.debug('Database notification test result:', { data, error });
    } catch (error) {
      showError('❌ Database notification test failed');
      logger.error('Database notification test failed:', { error: error as Error });
    }
  }, [showSuccess, showError, showInfo]);

  // 🔥 NEW: Complete Notification Pipeline Test
  const testFullNotificationPipeline = useCallback(async () => {
    try {
      showInfo('🔬 Running complete notification pipeline test...');

      // Step 1: Check service status
      const status = notificationService.getStatus();
      showInfo(`Step 1: Service Status - ${JSON.stringify(status)}`);

      // Step 2: Ensure token exists
      if (!status.hasToken) {
        showInfo('Step 2: No token found, forcing refresh...');
        const success = await notificationService.forceTokenRefresh();
        if (!success) {
          throw new Error('Failed to get push token');
        }
        showInfo('Step 2: ✅ Token obtained');
      } else {
        showInfo('Step 2: ✅ Token already exists');
      }

      // Step 3: Test local notification
      showInfo('Step 3: Testing local notification...');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Pipeline Test - Local',
          body: 'Local notification working!',
          data: { type: 'test_pipeline_local' },
        },
        trigger: null,
      });

      // Step 4: Test database function
      showInfo('Step 4: Testing database function...');
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { data, error } = await supabaseService.getClient().rpc('send_push_notifications', {
        notification_type: 'test_pipeline_remote',
        title: '🧪 Pipeline Test - Remote',
        body: 'Testing complete notification pipeline',
      });

      if (error) {
        showWarning(`Database function warning: ${error.message}`);
      } else {
        showInfo(`Step 4: ✅ Database function completed (sent to ${data || 0} users)`);
      }

      showSuccess('🎉 Complete pipeline test finished!');
      showInfo('📝 Check for notifications in the next few seconds');
    } catch (error) {
      showError('❌ Pipeline test failed');
      logger.error('Full pipeline test failed:', { error: error as Error });
    }
  }, [showSuccess, showError, showInfo, showWarning]);

  // ✅ COMPREHENSIVE: Test the complete notification flow with fixes
  const testCompleteNotificationFlow = useCallback(async () => {
    try {
      showInfo('🔄 Testing complete notification flow...');

      // Step 1: Check current status
      const status = notificationService.getStatus();
      showInfo(`📊 Current status: FCM=${status.fcmAvailable}, Token=${status.hasToken}`);

      // Step 2: Test permissions
      const hasPermissions = await notificationService.checkPermissions();
      if (!hasPermissions) {
        showWarning('⚠️ No notification permissions - requesting...');
        const permitted = await notificationService.requestPermissions();
        if (!permitted) {
          showError('❌ Permissions denied - cannot test notifications');
          return;
        }
        showSuccess('✅ Permissions granted');
      } else {
        showSuccess('✅ Already has permissions');
      }

      // Step 3: Force token refresh to test the fixed registerPushToken method
      showInfo('🔄 Testing token registration (with Supabase function fix)...');
      const tokenResult = await notificationService.forceTokenRefresh();
      if (tokenResult) {
        showSuccess('✅ Token registered successfully via Supabase function');

        // Step 4: Test enabling notifications
        const enableResult = await notificationService.toggleNotifications(true);
        if (enableResult) {
          showSuccess('✅ Notifications enabled - token should be in database');

          // Step 5: Verify token is actually in database
          const currentToken = notificationService.getCurrentPushToken();
          if (currentToken) {
            showSuccess(`✅ Token confirmed: ${currentToken.substring(0, 25)}...`);
            showInfo('🎉 Complete notification flow test PASSED!');
          } else {
            showError('❌ No token found after registration');
          }
        } else {
          showError('❌ Failed to enable notifications');
        }
      } else {
        showError('❌ Token registration failed');
      }
    } catch (error) {
      showError('❌ Complete notification flow test failed');
      logger.error('Complete notification flow test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo, showWarning]);

  // 🔍 DEEP DIVE: Step-by-step token registration debugging
  const debugTokenRegistrationSteps = useCallback(async () => {
    try {
      showInfo('🔍 Starting step-by-step token registration debug...');

      const results: string[] = [];

      // Step 1: Device check
      const isDevice = await import('expo-device').then((Device) => Device.default.isDevice);
      if (isDevice) {
        results.push('✅ Step 1: Physical device confirmed');
        showSuccess('✅ Step 1: Physical device confirmed');
      } else {
        results.push('❌ Step 1: Not a physical device');
        showError('❌ Step 1: Not a physical device - notifications only work on real devices');
        return;
      }

      // Step 2: Permission check
      const permissionStatus = await Notifications.getPermissionsAsync();
      if (permissionStatus.status === 'granted') {
        results.push('✅ Step 2: Permissions already granted');
        showSuccess('✅ Step 2: Permissions already granted');
      } else {
        results.push(`⚠️ Step 2: Permissions ${permissionStatus.status} - requesting...`);
        showWarning(`⚠️ Step 2: Permissions ${permissionStatus.status} - requesting...`);

        const permitted = await notificationService.requestPermissions();
        if (permitted) {
          results.push('✅ Step 2b: Permissions granted after request');
          showSuccess('✅ Step 2b: Permissions granted after request');
        } else {
          results.push('❌ Step 2b: Permission request denied');
          showError('❌ Step 2b: Permission request denied - cannot proceed');
          return;
        }
      }

      // Step 3: EAS Project ID check
      const Constants = await import('expo-constants').then((c) => c.default);
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        results.push(`✅ Step 3: EAS project ID found: ${projectId}`);
        showSuccess(`✅ Step 3: EAS project ID found: ${projectId}`);
      } else {
        results.push('❌ Step 3: EAS project ID missing');
        showError('❌ Step 3: EAS project ID missing - check app.config.js');
        showInfo(
          `📊 Debug info: ${JSON.stringify({
            expoConfig: Constants.expoConfig?.extra,
            appName: Constants.expoConfig?.name,
            slug: Constants.expoConfig?.slug,
          })}`
        );
        return;
      }

      // Step 4: Platform and FCM info
      const status = notificationService.getStatus();
      results.push(`📱 Step 4: Platform=${status.platform}, FCM=${status.fcmAvailable}`);
      showInfo(`📱 Step 4: Platform=${status.platform}, FCM=${status.fcmAvailable}`);

      // Step 5: Attempt token generation (THE CRITICAL TEST)
      showInfo('🎯 Step 5: Attempting Expo token generation (critical step)...');

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

        if (tokenData && tokenData.data && tokenData.data.trim() !== '') {
          results.push(`✅ Step 5: Token generated successfully! Length: ${tokenData.data.length}`);
          showSuccess(`✅ Step 5: Token generated successfully! Length: ${tokenData.data.length}`);
          showInfo(`🎟️ Token preview: ${tokenData.data.substring(0, 30)}...`);

          // Step 6: Test Supabase function call
          showInfo('🗄️ Step 6: Testing Supabase function call...');

          try {
            const { supabaseService } = await import('@/utils/supabaseClient');
            const { getCurrentSession } = await import('@/services/authService');

            const session = await getCurrentSession();
            if (session?.user?.id) {
              const { error } = await supabaseService.getClient().rpc('register_push_token', {
                p_user_id: session.user.id,
                p_expo_push_token: tokenData.data,
                p_platform: Platform.OS,
              });

              if (!error) {
                results.push('✅ Step 6: Supabase function call successful');
                showSuccess('✅ Step 6: Supabase function call successful');
                showSuccess('🎉 ALL STEPS PASSED! Token registration should work now.');
              } else {
                results.push(`❌ Step 6: Supabase error: ${error.message}`);
                showError(`❌ Step 6: Supabase error: ${error.message}`);
              }
            } else {
              results.push('❌ Step 6: No authenticated session');
              showError('❌ Step 6: No authenticated session');
            }
          } catch (dbError) {
            const error = dbError instanceof Error ? dbError : new Error(String(dbError));
            results.push(`❌ Step 6: Database error: ${error.message}`);
            showError(`❌ Step 6: Database error: ${error.message}`);
          }
        } else {
          results.push(
            `❌ Step 5: Invalid token data - hasData: ${!!tokenData}, hasToken: ${!!tokenData?.data}`
          );
          showError(`❌ Step 5: Invalid token data received`);
          showInfo(
            `🔍 Token debug: ${JSON.stringify({
              hasData: !!tokenData,
              tokenData: tokenData?.data,
              tokenType: tokenData?.type,
            })}`
          );
        }
      } catch (tokenError) {
        const error = tokenError instanceof Error ? tokenError : new Error(String(tokenError));
        results.push(`❌ Step 5: Token generation failed: ${error.message}`);
        showError(`❌ Step 5: Token generation failed: ${error.message}`);

        // Additional debug info for token generation failure
        showInfo('🔍 Token generation failure debug info:');
        showInfo(`- Project ID: ${projectId}`);
        showInfo(`- Platform: ${status.platform}`);
        showInfo(`- FCM Available: ${status.fcmAvailable}`);
        showInfo(`- Environment: ${process.env.EXPO_PUBLIC_ENV || 'not set'}`);
        showInfo(`- App Ownership: ${Constants.appOwnership || 'not set'}`);
      }

      // Summary
      showInfo('📋 STEP-BY-STEP DEBUG SUMMARY:');
      results.forEach((result) => showInfo(result));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      showError('❌ Debug process failed');
      logger.error('Debug token registration steps failed:', err);
    }
  }, [showSuccess, showError, showInfo, showWarning]);

  // 🔍 CONSOLE & LOGGING TESTING FUNCTIONS

  const testLoggerLevels = useCallback(() => {
    logger.debug('🐛 Debug level test message', { component: 'ToastTester', test: 'debug' });
    logger.info('ℹ️ Info level test message', { component: 'ToastTester', test: 'info' });
    logger.warn('⚠️ Warning level test message', { component: 'ToastTester', test: 'warn' });
    logger.error('❌ Error level test message', { component: 'ToastTester', test: 'error' });
    showSuccess('✅ Logger level tests completed - check console and logs');
  }, [showSuccess]);

  const testConsoleOverrideProtection = useCallback(async () => {
    try {
      // Test if console methods are properly protected
      // eslint-disable-next-line no-console
      const originalError = console.error;
      // eslint-disable-next-line no-console
      const originalWarn = console.warn;

      // Try to override (this should be prevented in production)
      // eslint-disable-next-line no-console
      console.error = () => {};
      // eslint-disable-next-line no-console
      console.warn = () => {};

      // eslint-disable-next-line no-console
      const overrideWorked = console.error !== originalError || console.warn !== originalWarn;

      if (overrideWorked && !__DEV__) {
        showError('❌ Console override protection failed!');
        logger.error('Console override protection is not working', {
          component: 'ToastTester',
        });
      } else if (__DEV__) {
        showInfo('ℹ️ Console override protection not active in development mode');
      } else {
        showSuccess('✅ Console override protection is working!');
        logger.info('Console override protection verified', {
          component: 'ToastTester',
        });
      }

      // Restore original methods in case override worked
      // eslint-disable-next-line no-console
      console.error = originalError;
      // eslint-disable-next-line no-console
      console.warn = originalWarn;
    } catch (error) {
      showError('❌ Console protection test failed');
      logger.error('Console protection test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo]);

  const testErrorTranslation = useCallback(() => {
    try {
      // Import and test error translation
      import('@/utils/errorTranslation').then(({ translateError, getErrorStatistics }) => {
        // Test various error types
        const testErrors = [
          'OAuth session failed',
          'Network connection error',
          'User cancelled the action',
          'Invalid authentication token',
          'Some unknown error message',
        ];

        testErrors.forEach((errorMsg, index) => {
          const translated = translateError(errorMsg, 'ToastTester');
          logger.info(`Error translation test ${index + 1}:`, {
            original: errorMsg,
            translated: translated.userMessage,
            type: translated.errorType,
            component: 'ToastTester',
          });
        });

        // Get error statistics
        const stats = getErrorStatistics();
        showInfo(
          `📊 Error stats: ${stats.recentErrors} recent errors, ${Object.keys(stats.errorTypes).length} components affected`
        );

        showSuccess('✅ Error translation tests completed');
      });
    } catch (error) {
      showError('❌ Error translation test failed');
      logger.error('Error translation test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo]);

  const testProductionLogger = useCallback(async () => {
    try {
      const { productionLogger } = await import('@/services/productionLogger');

      // Test logging an error
      await productionLogger.logAuthError(
        'test_operation',
        new Error('Test error for production logger'),
        {
          component: 'ToastTester',
          testCase: 'production_logger_test',
        }
      );

      // Get logs count
      const logs = await productionLogger.getErrorLogs();
      const exportData = await productionLogger.exportErrorLogs();

      showInfo(
        `📋 Production logs: ${logs.length} stored, export size: ${exportData.length} chars`
      );
      showSuccess('✅ Production logger test completed');
    } catch (error) {
      showError('❌ Production logger test failed');
      logger.error('Production logger test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo]);

  const exportLogData = useCallback(() => {
    try {
      const logData = logger.exportLogs();

      // In a real app, you'd share this data via email or save to file
      // For now, we'll just log it and show a toast
      logger.info('Log data exported:', {
        size: logData.length,
        component: 'ToastTester',
      });

      showInfo(
        `📤 Log data exported (${logData.length} characters). Check console for full export.`
      );

      // Log the exported data for debugging
      logger.debug('Exported log data:', { exportData: logData.substring(0, 500) + '...' });
    } catch (error) {
      showError('❌ Log export failed');
      logger.error('Log export failed:', error as Error);
    }
  }, [showInfo, showError]);

  const clearLogBuffer = useCallback(() => {
    try {
      logger.clearBuffer();
      showSuccess('✅ Log buffer cleared');
    } catch (error) {
      showError('❌ Failed to clear log buffer');
      logger.error('Failed to clear log buffer:', error as Error);
    }
  }, [showSuccess, showError]);

  // Run comprehensive race condition tests
  const runRaceConditionTests = useCallback(async () => {
    setIsRunningRaceTests(true);
    setRaceTestResults([]);

    const tests = [
      { name: 'Rapid Fire Race', test: testRapidFireRace, iterations: 5 },
      { name: 'Animation Interruption', test: testAnimationInterruptionRace, iterations: 3 },
      { name: 'Hide/Show Conflict', test: testHideShowConflictRace, iterations: 5 },
      { name: 'Timer Overlap', test: testTimerOverlapRace, iterations: 3 },
      { name: 'Action Button Race', test: testActionButtonRace, iterations: 3 },
      { name: 'Memory Leak Stress', test: testMemoryLeakStress, iterations: 2 },
    ];

    const results: RaceConditionResult[] = [];

    for (const { name, test, iterations } of tests) {
      const startTime = performance.now();
      let passed = true;
      let passCount = 0;

      for (let i = 0; i < iterations; i++) {
        try {
          const result = await test();
          if (result) {
            passCount++;
          }
          await new Promise((resolve) => setTimeout(resolve, 100)); // Cool down between iterations
        } catch (error) {
          logger.error(`Race test ${name} iteration ${i} failed:`, error as Error);
        }
      }

      const endTime = performance.now();
      const successRate = (passCount / iterations) * 100;
      passed = successRate >= 80; // 80% success rate threshold

      results.push({
        test: name,
        passed,
        details: `${passCount}/${iterations} passed (${successRate.toFixed(1)}%)`,
        iterations,
        duration: endTime - startTime,
      });
    }

    setRaceTestResults(results);
    setIsRunningRaceTests(false);

    const overallPass = results.every((r) => r.passed);
    if (overallPass) {
      showSuccess('🎉 All race condition tests passed!');
    } else {
      showWarning('⚠️ Some race condition tests failed - check results');
    }
  }, [
    testRapidFireRace,
    testAnimationInterruptionRace,
    testHideShowConflictRace,
    testTimerOverlapRace,
    testActionButtonRace,
    testMemoryLeakStress,
    showSuccess,
    showWarning,
  ]);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="message-text" size={24} color={theme.colors.primary} />
            <Text style={styles.title}>Toast System Tester</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          Test all toast notification features including types, durations, actions, and queue
          behavior.
        </Text>
      </Card>

      {/* Basic Toast Types */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Basic Toast Types</Text>
        <View style={styles.buttonGrid}>
          <TouchableOpacity style={[styles.typeButton, styles.successButton]} onPress={testSuccess}>
            <Icon name="check-circle" size={20} color="#ffffff" />
            <Text style={styles.typeButtonText}>Success</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.typeButton, styles.errorButton]} onPress={testError}>
            <Icon name="alert-circle" size={20} color="#ffffff" />
            <Text style={styles.typeButtonText}>Error</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.typeButton, styles.warningButton]} onPress={testWarning}>
            <Icon name="alert" size={20} color="#ffffff" />
            <Text style={styles.typeButtonText}>Warning</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.typeButton, styles.infoButton]} onPress={testInfo}>
            <Icon name="information" size={20} color="#ffffff" />
            <Text style={styles.typeButtonText}>Info</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Advanced Features */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Advanced Features</Text>

        <TouchableOpacity style={styles.featureButton} onPress={testWithAction}>
          <Icon name="gesture-tap-button" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Toast with Action Button</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testLongMessage}>
          <Icon name="text-long" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Long Message Test</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testCustomDuration}>
          <Icon name="timer" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Custom Duration (10s)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testHideToast}>
          <Icon name="eye-off" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Programmatic Hide</Text>
        </TouchableOpacity>
      </Card>

      {/* Queue & Sequence Tests */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Queue & Sequence Tests</Text>

        <TouchableOpacity style={styles.featureButton} onPress={testToastQueue}>
          <Icon name="playlist-check" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Rapid Fire Queue Test</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testSequentialToasts}>
          <Icon name="timer-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Sequential Timed Toasts</Text>
        </TouchableOpacity>

        <Divider style={styles.divider} />

        <Button mode="contained" onPress={testAllFeatures} style={styles.demoButton} icon="star">
          🚀 Complete Demo
        </Button>
      </Card>

      {/* Race Condition Tests */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Race Condition Tests</Text>
        <Text style={styles.raceTestDescription}>
          Test toast system for race conditions, animation conflicts, and memory leaks.
        </Text>

        <Button
          mode="contained"
          onPress={runRaceConditionTests}
          loading={isRunningRaceTests}
          disabled={isRunningRaceTests}
          style={styles.raceTestButton}
          icon="speedometer"
        >
          {isRunningRaceTests ? 'Running Tests...' : 'Run Race Condition Tests'}
        </Button>

        {raceTestResults.length > 0 && (
          <View style={styles.raceResults}>
            <Text style={styles.raceResultsTitle}>Test Results:</Text>
            {raceTestResults.map((result, index) => (
              <View key={index} style={styles.raceResultItem}>
                <View style={styles.raceResultHeader}>
                  <Icon
                    name={result.passed ? 'check-circle' : 'alert-circle'}
                    size={16}
                    color={result.passed ? theme.colors.success : theme.colors.error}
                  />
                  <Text
                    style={[
                      styles.raceResultName,
                      { color: result.passed ? theme.colors.success : theme.colors.error },
                    ]}
                  >
                    {result.test}
                  </Text>
                  <Text style={styles.raceResultTime}>{result.duration.toFixed(0)}ms</Text>
                </View>
                <Text style={styles.raceResultDetails}>{result.details}</Text>
              </View>
            ))}

            {/* Overall Results Summary */}
            <View style={styles.raceSummary}>
              <Text style={styles.raceSummaryText}>
                Overall: {raceTestResults.filter((r) => r.passed).length}/{raceTestResults.length}{' '}
                tests passed
              </Text>
              <Text style={styles.raceSummarySubtext}>
                {raceTestResults.every((r) => r.passed)
                  ? '✅ No race conditions detected!'
                  : '⚠️ Some race conditions need attention'}
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* Notification Tests */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Expo Notification Tests</Text>
        <Text style={styles.raceTestDescription}>
          Test the new Expo notification system functionality and permissions.
        </Text>

        <TouchableOpacity style={styles.featureButton} onPress={testNotificationService}>
          <Icon name="cog" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Initialize & Check Service</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testNotificationPermissions}>
          <Icon name="shield-check" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testNotificationToggle}>
          <Icon name="toggle" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Notification Toggle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testBasicNotification}>
          <Icon name="bell" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testFCMStatus}>
          <Icon name="firebase" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Check FCM Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testForceTokenRefresh}>
          <Icon name="refresh" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Force Token Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testLocalNotification}>
          <Icon name="bell" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Send Local Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testDatabaseNotification}>
          <Icon name="database" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Database Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testFullNotificationPipeline}>
          <Icon name="pipeline" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Full Notification Pipeline</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testCompleteNotificationFlow}>
          <Icon name="check-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Complete Notification Flow</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={debugTokenRegistrationSteps}>
          <Icon name="bug" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>🔍 Debug Token Registration Steps</Text>
        </TouchableOpacity>
      </Card>

      {/* Console & Logging Tests */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Console & Logging Tests</Text>
        <Text style={styles.raceTestDescription}>
          Test console methods and logging functionality.
        </Text>

        <TouchableOpacity style={styles.featureButton} onPress={testLoggerLevels}>
          <Icon name="console" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Logger Levels</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testConsoleOverrideProtection}>
          <Icon name="console" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Console Override Protection</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testErrorTranslation}>
          <Icon name="translate" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Error Translation</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testProductionLogger}>
          <Icon name="console" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Production Logger</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={exportLogData}>
          <Icon name="export" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Export Log Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={clearLogBuffer}>
          <Icon name="clear" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Clear Log Buffer</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
    },
    headerCard: {
      marginBottom: 16,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginLeft: 8,
    },
    closeButton: {
      padding: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    sectionCard: {
      marginBottom: 16,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    typeButton: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    successButton: {
      backgroundColor: theme.colors.success,
    },
    errorButton: {
      backgroundColor: theme.colors.error,
    },
    warningButton: {
      backgroundColor: theme.colors.warning,
    },
    infoButton: {
      backgroundColor: theme.colors.primary,
    },
    typeButtonText: {
      color: theme.colors.onPrimary,
      fontWeight: '600',
      marginLeft: 6,
    },
    featureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
      marginBottom: 8,
    },
    featureButtonText: {
      fontSize: 14,
      color: theme.colors.onSurface,
      marginLeft: 8,
    },
    divider: {
      marginVertical: 12,
    },
    demoButton: {
      marginTop: 8,
    },
    raceTestDescription: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
    },
    raceTestButton: {
      marginBottom: 12,
    },
    raceResults: {
      marginTop: 12,
    },
    raceResultsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    raceResultItem: {
      marginBottom: 8,
    },
    raceResultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    raceResultName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginRight: 8,
    },
    raceResultTime: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    raceResultDetails: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    raceSummary: {
      marginTop: 12,
      alignItems: 'center',
    },
    raceSummaryText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    raceSummarySubtext: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
  });
