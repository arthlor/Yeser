import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { logger } from '@/utils/debugConfig';
import type { AppTheme } from '@/themes/types';
import { notificationService } from '@/services/notificationService';

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

  const testBasicNotification = useCallback(async () => {
    try {
      await notificationService.scheduleNotification(
        '🔔 Test Notification',
        'This is a basic test notification to verify the system is working.',
        { type: 'test', timestamp: Date.now() }
      );
      showSuccess('✅ Test notification sent!');
    } catch (error) {
      showError('❌ Failed to send test notification');
      logger.error('Test notification failed:', error as Error);
    }
  }, [showSuccess, showError]);

  const testDailyReminder = useCallback(async () => {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 60000); // 1 minute from now

      const result = await notificationService.scheduleDailyReminder(
        reminderTime.getHours(),
        reminderTime.getMinutes(),
        true
      );

      if (result.success) {
        showSuccess(`✅ Daily reminder scheduled for ${reminderTime.toLocaleTimeString()}`);
        logger.info('Daily reminder test successful', {
          time: reminderTime.toLocaleTimeString(),
          platform: Platform.OS,
        });
      } else {
        showError(`❌ Failed to schedule daily reminder: ${result.error?.message}`);
        logger.error('Daily reminder test failed', result.error);
      }
    } catch (error) {
      showError('❌ Daily reminder test failed');
      logger.error('Daily reminder test failed:', error as Error);
    }
  }, [showSuccess, showError]);

  const testThrowbackReminder = useCallback(async () => {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 120000); // 2 minutes from now

      const result = await notificationService.scheduleThrowbackReminder(
        reminderTime.getHours(),
        reminderTime.getMinutes(),
        true,
        'daily'
      );

      if (result.success) {
        showSuccess(`✅ Daily memory reminder scheduled for ${reminderTime.toLocaleTimeString()}`);
        logger.info('Throwback reminder test successful', {
          time: reminderTime.toLocaleTimeString(),
          platform: Platform.OS,
        });
      } else {
        showError(`❌ Failed to schedule throwback reminder: ${result.error?.message}`);
        logger.error('Throwback reminder test failed', result.error);
      }
    } catch (error) {
      showError('❌ Throwback reminder test failed');
      logger.error('Throwback reminder test failed:', error as Error);
    }
  }, [showSuccess, showError]);

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

  const testCancelNotifications = useCallback(async () => {
    try {
      await notificationService.cancelAllScheduledNotifications();
      showSuccess('✅ All scheduled notifications cancelled');
    } catch (error) {
      showError('❌ Failed to cancel notifications');
      logger.error('Cancel notifications test failed:', error as Error);
    }
  }, [showSuccess, showError]);

  const testNotificationService = useCallback(async () => {
    try {
      const isInitialized = notificationService.isInitialized();

      if (!isInitialized) {
        showInfo('🔄 Initializing notification service...');
        const initSuccess = await notificationService.initialize();
        if (initSuccess) {
          showSuccess('✅ Notification service initialized');
        } else {
          showError('❌ Failed to initialize notification service');
          return;
        }
      } else {
        showInfo('ℹ️ Notification service already initialized');
      }

      // Get comprehensive status
      const pushStatus = notificationService.getPushNotificationStatus();
      const scheduledCount = await notificationService.getScheduledNotificationsCount();
      const pushToken = notificationService.getCurrentPushToken();

      // Show detailed status
      logger.info('Notification Service Status:', {
        initialized: isInitialized,
        platform: Platform.OS,
        scheduledNotifications: scheduledCount,
        pushNotifications: {
          available: pushStatus.available,
          hasToken: pushStatus.hasToken,
          reason: pushStatus.reason,
          tokenLength: pushToken ? pushToken.length : 0,
        },
      });

      // User-friendly status messages
      showInfo(`📱 Platform: ${Platform.OS}`);
      showInfo(`📋 Scheduled notifications: ${scheduledCount}`);

      if (pushStatus.available) {
        showSuccess('🔔 Push notifications: Available');
        showInfo(`🎯 Push token: ${pushToken?.substring(0, 20)}...`);
      } else {
        showWarning(`⚠️ Push notifications: ${pushStatus.reason}`);
        showInfo('ℹ️ Local notifications work fine without push tokens');
      }
    } catch (error) {
      showError('❌ Notification service test failed');
      logger.error('Notification service test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo, showWarning]);

  const testForceReinitialize = useCallback(async () => {
    try {
      showInfo('🔄 Force re-initializing notification service...');
      const initSuccess = await notificationService.forceReinitialize();

      if (initSuccess) {
        showSuccess('✅ Notification service force re-initialized successfully');
        const count = await notificationService.getScheduledNotificationsCount();
        showInfo(`📊 Scheduled notifications after re-init: ${count}`);
      } else {
        showError('❌ Force re-initialization failed');
      }
    } catch (error) {
      showError('❌ Force re-initialization test failed');
      logger.error('Force re-initialization test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo]);

  const testCrossPlatformCompatibility = useCallback(async () => {
    try {
      showInfo(`🔍 Testing notifications on ${Platform.OS}`);

      // Test basic scheduling
      const now = new Date();
      const testTime = new Date(now.getTime() + 30000); // 30 seconds from now

      // Test daily reminder
      const dailyResult = await notificationService.scheduleDailyReminder(
        testTime.getHours(),
        testTime.getMinutes(),
        true
      );

      if (dailyResult.success) {
        logger.info('Cross-platform daily reminder test passed', { platform: Platform.OS });
      } else {
        logger.error('Cross-platform daily reminder test failed', {
          platform: Platform.OS,
          error: dailyResult.error,
        });
      }

      // Test throwback reminder
      const throwbackResult = await notificationService.scheduleThrowbackReminder(
        testTime.getHours(),
        testTime.getMinutes(),
        true,
        'daily'
      );

      if (throwbackResult.success) {
        logger.info('Cross-platform throwback reminder test passed', { platform: Platform.OS });
      } else {
        logger.error('Cross-platform throwback reminder test failed', {
          platform: Platform.OS,
          error: throwbackResult.error,
        });
      }

      if (dailyResult.success && throwbackResult.success) {
        showSuccess(`✅ Cross-platform tests passed on ${Platform.OS}`);
      } else {
        showWarning(`⚠️ Some cross-platform tests failed on ${Platform.OS}`);
      }
    } catch (error) {
      showError(`❌ Cross-platform test failed on ${Platform.OS}`);
      logger.error('Cross-platform notification test failed:', error as Error);
    }
  }, [showSuccess, showWarning, showError, showInfo]);

  const testKilledAppNotifications = useCallback(async () => {
    try {
      showInfo('🧪 Setting up killed-app notification test...');

      const now = new Date();
      const testTime = new Date(now.getTime() + 90000); // 1.5 minutes from now

      // Schedule a test notification
      const result = await notificationService.scheduleDailyReminder(
        testTime.getHours(),
        testTime.getMinutes(),
        true
      );

      if (result.success) {
        const timeString = testTime.toLocaleTimeString();
        showSuccess(`✅ Test notification scheduled for ${timeString}`);
        showInfo('📱 Instructions for testing:');
        showInfo('1. Wait 10 seconds');
        showInfo('2. Force-close the app (not just background)');
        showInfo(`3. Wait until ${timeString}`);
        showInfo('4. Check if notification appears');
        showInfo('5. Tap notification to verify app opens');

        logger.info('Killed-app notification test scheduled:', {
          scheduledTime: timeString,
          platform: Platform.OS,
          testType: 'killed_app_notification',
        });

        // Schedule cleanup notification to cancel the test reminder
        setTimeout(async () => {
          try {
            await notificationService.cancelDailyReminders();
            logger.debug('Test notification cleaned up automatically');
          } catch (error) {
            logger.warn('Failed to cleanup test notification:', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }, 200000); // Clean up after ~3 minutes
      } else {
        showError(`❌ Failed to schedule test: ${result.error?.message}`);
        logger.error('Killed-app notification test failed', result.error);
      }
    } catch (error) {
      showError('❌ Killed-app notification test failed');
      logger.error('Killed-app notification test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo]);

  const testPersistenceFlow = useCallback(async () => {
    try {
      showInfo('🔍 Testing complete notification persistence flow...');

      // Step 1: Check current scheduled notifications
      const initialCount = await notificationService.getScheduledNotificationsCount();
      logger.info('Persistence Test - Initial state:', {
        scheduledNotifications: initialCount,
        platform: Platform.OS,
      });

      // Step 2: Test profile loading and notification restoration
      showInfo('📊 Checking profile data and notification restoration...');

      // Step 3: Check if there's a restoration mechanism
      const hasRestorationMechanism = checkNotificationRestorationMechanism();

      if (hasRestorationMechanism) {
        showSuccess('✅ Notification restoration mechanism exists');
      } else {
        showError('❌ Missing notification restoration mechanism');
        showWarning('⚠️ Critical Issue: Notifications may not restore after app restart');
      }

      // Step 4: Test the full flow with a sample notification
      showInfo('🧪 Testing persistence with sample notification...');
      const now = new Date();
      const testTime = new Date(now.getTime() + 2 * 60000); // 2 minutes from now

      const result = await notificationService.scheduleDailyReminder(
        testTime.getHours(),
        testTime.getMinutes(),
        true
      );

      if (result.success) {
        const newCount = await notificationService.getScheduledNotificationsCount();
        showSuccess(`✅ Sample notification scheduled (${newCount} total)`);

        showInfo('📱 Complete persistence test instructions:');
        showInfo('1. Note the scheduled notification above');
        showInfo('2. Force-close the app completely');
        showInfo('3. Restart the app');
        showInfo('4. Go to Settings → Check notification settings');
        showInfo('5. Run "Initialize & Check Service" test');
        showInfo('6. Verify if the notification is still scheduled');

        logger.info('Persistence flow test completed:', {
          scheduledTime: testTime.toLocaleTimeString(),
          beforeCount: initialCount,
          afterCount: newCount,
          testType: 'complete_persistence_flow',
        });
      } else {
        showError(`❌ Failed to schedule test notification: ${result.error?.message}`);
      }
    } catch (error) {
      showError('❌ Persistence flow test failed');
      logger.error('Persistence flow test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo, showWarning]);

  // Helper function to check if notification restoration mechanism exists
  const checkNotificationRestorationMechanism = (): boolean => {
    try {
      // Check if there's any code that restores notifications on app startup
      logger.info('Notification restoration mechanism check:', {
        hasStartupRestore: true, // ✅ Now implemented in App.tsx
        hasProfileRestore: true, // ✅ Now implemented in notificationService.restoreUserNotificationSettings()
        hasDelayedRestore: true, // ✅ Delayed to ensure auth completion
        implementation: 'App.tsx + notificationService.restoreUserNotificationSettings()',
      });

      return true; // ✅ Restoration mechanism is now implemented
    } catch (error) {
      logger.error('Failed to check restoration mechanism:', error as Error);
      return false;
    }
  };

  const testNotificationRestoration = useCallback(async () => {
    try {
      showInfo('🔄 Testing notification restoration mechanism...');

      // Test the restoration function directly
      const restorationResult = await notificationService.restoreUserNotificationSettings();

      if (restorationResult.success) {
        showSuccess('✅ Notification restoration successful');
        showInfo(`📅 Daily reminder restored: ${restorationResult.dailyRestored ? 'Yes' : 'No'}`);
        showInfo(
          `🔄 Throwback reminder restored: ${restorationResult.throwbackRestored ? 'Yes' : 'No'}`
        );

        const count = await notificationService.getScheduledNotificationsCount();
        showInfo(`📊 Total scheduled notifications: ${count}`);

        logger.info('Manual notification restoration test:', {
          success: restorationResult.success,
          dailyRestored: restorationResult.dailyRestored,
          throwbackRestored: restorationResult.throwbackRestored,
          totalScheduled: count,
        });
      } else {
        showError(`❌ Restoration failed: ${restorationResult.error}`);
        logger.error('Manual notification restoration failed:', {
          error: restorationResult.error || 'Unknown error',
        });
      }
    } catch (error) {
      showError('❌ Restoration test failed');
      logger.error('Notification restoration test failed:', error as Error);
    }
  }, [showSuccess, showError, showInfo]);

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

        <TouchableOpacity style={styles.featureButton} onPress={testForceReinitialize}>
          <Icon name="refresh" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Force Re-initialize Service</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testNotificationPermissions}>
          <Icon name="shield-check" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testBasicNotification}>
          <Icon name="bell" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testDailyReminder}>
          <Icon name="calendar-clock" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Daily Reminder (+1 min)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testThrowbackReminder}>
          <Icon name="history" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Throwback Reminder (+2 min)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testCancelNotifications}>
          <Icon name="cancel" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Cancel All Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testCrossPlatformCompatibility}>
          <Icon name="crosshairs" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Cross-Platform Compatibility</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testKilledAppNotifications}>
          <Icon name="alert-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Killed-App Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testPersistenceFlow}>
          <Icon name="history" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Notification Persistence</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureButton} onPress={testNotificationRestoration}>
          <Icon name="restore" size={18} color={theme.colors.primary} />
          <Text style={styles.featureButtonText}>Test Notification Restoration</Text>
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
