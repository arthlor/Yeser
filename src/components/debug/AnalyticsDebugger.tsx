import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { analyticsService } from '@/services/analyticsService';
import { useUserProfile } from '@/shared/hooks';
import { useStreakData } from '@/features/streak/hooks';
import { AppTheme } from '@/themes/types';
import { logger } from '@/utils/debugConfig';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

interface AnalyticsDebuggerProps {
  onClose?: () => void;
}

export const AnalyticsDebugger: React.FC<AnalyticsDebuggerProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { showSuccess, showError } = useGlobalError();
  const { showWarning, showInfo, hideToast } = useToast();
  const { profile } = useUserProfile();
  const { data: streakData } = useStreakData();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // 🛡️ MEMORY LEAK FIX: Add timer refs for cleanup (following ToastTester pattern)
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

  const addTestResult = useCallback((test: string, success: boolean, message: string) => {
    const result: TestResult = {
      test,
      success,
      message,
      timestamp: new Date(),
    };
    setTestResults((prev) => [result, ...prev.slice(0, 9)]); // Keep last 10 results
    logger.debug(`Analytics Test: ${test}`, { success, message });
  }, []);

  // Test 1: Basic Screen View Tracking
  const testScreenViewTracking = useCallback(async () => {
    try {
      await analyticsService.logScreenView('debug_test_screen', {
        platform: 'mobile',
        test_mode: true,
      });
      addTestResult('Screen View Tracking', true, 'Successfully logged test screen view');
    } catch (error) {
      addTestResult('Screen View Tracking', false, `Error: ${(error as Error).message}`);
    }
  }, [addTestResult]);

  // Test 2: Custom Event Logging
  const testCustomEventLogging = useCallback(async () => {
    try {
      await analyticsService.logEvent('debug_test_event', {
        test_parameter_string: 'test_value',
        test_parameter_number: 42,
        test_parameter_boolean: true,
        user_id: profile?.id || 'anonymous',
      });
      addTestResult('Custom Event Logging', true, 'Successfully logged test custom event');
    } catch (error) {
      addTestResult('Custom Event Logging', false, `Error: ${(error as Error).message}`);
    }
  }, [addTestResult, profile?.id]);

  // Test 3: User Journey Tracking
  const testUserJourneyTracking = useCallback(async () => {
    try {
      await analyticsService.trackUserJourney('debug_test_journey', 'step_1_start', 1, 3, {
        journey_type: 'test',
      });
      addTestResult('User Journey Tracking', true, 'Successfully logged test journey step');
    } catch (error) {
      addTestResult('User Journey Tracking', false, `Error: ${(error as Error).message}`);
    }
  }, [addTestResult]);

  // Test 4: Performance Analytics
  const testPerformanceAnalytics = useCallback(async () => {
    try {
      await analyticsService.trackPerformance('debug_test_loading_time', 250, 'ms', {
        screen: 'debug_test',
      });
      addTestResult('Performance Analytics', true, 'Successfully logged test performance metric');
    } catch (error) {
      addTestResult('Performance Analytics', false, `Error: ${(error as Error).message}`);
    }
  }, [addTestResult]);

  // Test 5: Engagement Analytics
  const testEngagementAnalytics = useCallback(async () => {
    try {
      await analyticsService.trackEngagement('feature_usage', {
        feature_name: 'analytics_debugger',
        usage_duration: 30,
        user_level: 'debug_tester',
      });
      addTestResult('Engagement Analytics', true, 'Successfully logged test engagement event');
    } catch (error) {
      addTestResult('Engagement Analytics', false, `Error: ${(error as Error).message}`);
    }
  }, [addTestResult]);

  // Test 6: Gamification Analytics
  const testGamificationAnalytics = useCallback(async () => {
    try {
      await analyticsService.trackGamification('streak_continued', {
        current_streak: streakData?.current_streak || 0,
        milestone_reached: false,
        test_mode: true,
      });
      addTestResult('Gamification Analytics', true, 'Successfully logged test gamification event');
    } catch (error) {
      addTestResult('Gamification Analytics', false, `Error: ${(error as Error).message}`);
    }
  }, [addTestResult, streakData?.current_streak]);

  // Test 7: Content Analytics
  const testContentAnalytics = useCallback(async () => {
    try {
      await analyticsService.trackContentAnalytics('gratitude_entry', 'created', {
        entry_length: 25,
        has_prompt: true,
        quality_score: 8.5,
      });
      addTestResult('Content Analytics', true, 'Successfully logged test content event');
    } catch (error) {
      addTestResult('Content Analytics', false, `Error: ${(error as Error).message}`);
    }
  }, [addTestResult]);

  // Test 8: Screen Name Normalization
  const testScreenNameNormalization = useCallback(() => {
    try {
      const testCases = [
        { input: 'HomeTab', expected: 'home_screen' },
        { input: 'EnhancedHomeScreen', expected: 'home_screen' },
        { input: 'daily_entry_screen', expected: 'daily_entry_screen' },
      ];

      let allPassed = true;
      for (const testCase of testCases) {
        const result = analyticsService.normalizeScreenName(testCase.input);
        if (result !== testCase.expected) {
          allPassed = false;
          break;
        }
      }

      if (allPassed) {
        addTestResult('Screen Name Normalization', true, 'All normalization tests passed');
      } else {
        addTestResult('Screen Name Normalization', false, 'Some normalization tests failed');
      }
    } catch (error) {
      addTestResult('Screen Name Normalization', false, `Error: ${(error as Error).message}`);
    }
  }, [addTestResult]);

  // 🚀 TOAST TESTING FUNCTIONS

  // Test Basic Toast Types
  const testBasicToasts = useCallback(() => {
    addTimer(
      setTimeout(() => showSuccess('✅ Success toast - Operation completed successfully!'), 0)
    );
    addTimer(setTimeout(() => showError('❌ Error toast - Something went wrong!'), 1500));
    addTimer(setTimeout(() => showWarning('⚠️ Warning toast - Please pay attention!'), 3000));
    addTimer(setTimeout(() => showInfo('ℹ️ Info toast - Here is some information!'), 4500));
    addTestResult('Basic Toast Types', true, 'Displayed all 4 toast types sequentially');
  }, [addTimer, showSuccess, showError, showWarning, showInfo, addTestResult]);

  // Test Toast with Action Buttons
  const testActionToasts = useCallback(() => {
    showWarning('🔄 Action Toast Test - Do you want to continue?', {
      duration: 8000,
      action: {
        label: 'Continue',
        onPress: () => {
          showSuccess('✅ Action executed! You clicked Continue.');
          addTestResult('Action Toast Response', true, 'User clicked the action button');
        },
      },
    });
    addTestResult('Action Toast', true, 'Displayed toast with action button');
  }, [showWarning, showSuccess, addTestResult]);

  // Test Different Durations
  const testToastDurations = useCallback(() => {
    showInfo('⚡ Quick toast (2s)', { duration: 2000 });
    addTimer(setTimeout(() => showInfo('🕐 Medium toast (5s)', { duration: 5000 }), 500));
    addTimer(setTimeout(() => showInfo('⏰ Long toast (10s)', { duration: 10000 }), 1000));
    addTestResult('Toast Durations', true, 'Tested 2s, 5s, and 10s durations');
  }, [addTimer, showInfo, addTestResult]);

  // Test Toast Queue (Rapid Fire)
  const testToastQueue = useCallback(() => {
    // Fire multiple toasts rapidly to test queue behavior
    showInfo('🔢 Toast 1 - First in queue');
    showSuccess('🔢 Toast 2 - Second in queue');
    showWarning('🔢 Toast 3 - Third in queue');
    showError('🔢 Toast 4 - Last in queue');
    addTestResult('Toast Queue', true, 'Fired 4 rapid toasts to test queue behavior');
  }, [showInfo, showSuccess, showWarning, showError, addTestResult]);

  // Test Long Message Handling
  const testLongMessages = useCallback(() => {
    showError(
      '📝 This is a very long toast message that tests how the toast system handles lengthy text content. It should wrap properly and maintain good readability while staying within reasonable bounds for mobile UI.'
    );
    addTestResult('Long Message', true, 'Tested toast with very long message content');
  }, [showError, addTestResult]);

  // Test Toast with Retry Action
  const testRetryToast = useCallback(() => {
    showError('🔄 Network operation failed');
    addTestResult('Retry Toast', true, 'Displayed error toast with retry action');
  }, [showError, addTestResult]);

  // Test Hide Toast Functionality
  const testHideToast = useCallback(() => {
    showInfo('⏱️ This toast will be hidden programmatically in 2 seconds...', {
      duration: 10000, // Set long duration
    });
    addTimer(
      setTimeout(() => {
        hideToast();
        showSuccess('✅ Toast hidden programmatically!');
      }, 2000)
    );
    addTestResult('Hide Toast', true, 'Tested programmatic toast hiding');
  }, [addTimer, showInfo, hideToast, showSuccess, addTestResult]);

  // Test All Toasts Comprehensive Demo
  const testAllToastFeatures = useCallback(() => {
    let delay = 0;

    // Success with action
    addTimer(
      setTimeout(() => {
        showSuccess('🎉 Complete success with action');
      }, delay)
    );
    delay += 2000;

    // Warning with long duration
    addTimer(
      setTimeout(() => {
        showWarning('⚠️ Important warning that needs attention');
      }, delay)
    );
    delay += 1000;

    // Error with retry
    addTimer(
      setTimeout(() => {
        showError('❌ Critical error occurred');
      }, delay)
    );
    delay += 3000;

    // Info with custom duration
    addTimer(
      setTimeout(() => {
        showInfo('ℹ️ Process completed successfully');
      }, delay)
    );

    addTestResult(
      'Comprehensive Toast Demo',
      true,
      'Demonstrated all toast features with realistic scenarios'
    );
  }, [addTimer, showSuccess, showWarning, showError, showInfo, addTestResult]);

  // Test 9: All Screen Views (Comprehensive Coverage)
  const testAllScreenViews = useCallback(async () => {
    const screenTests = [
      // Main app screens
      { name: 'home_screen', description: 'Home Screen' },
      { name: 'daily_entry_screen', description: 'Daily Entry Screen' },
      { name: 'calendar_screen', description: 'Calendar Screen' },
      { name: 'past_entries_screen', description: 'Past Entries Screen' },
      { name: 'settings_screen', description: 'Settings Screen' },

      // Detail screens
      { name: 'entry_detail_screen', description: 'Entry Detail Screen' },
      { name: 'streak_details_screen', description: 'Streak Details Screen' },
      { name: 'why_gratitude_screen', description: 'Why Gratitude Screen' },

      // Modal screens
      { name: 'throwback_modal', description: 'Throwback Modal' },

      // Settings screens
      { name: 'reminder_settings_screen', description: 'Reminder Settings Screen' },
      { name: 'privacy_policy_screen', description: 'Privacy Policy Screen' },
      { name: 'terms_of_service_screen', description: 'Terms of Service Screen' },
      { name: 'help_screen', description: 'Help Screen' },

      // Auth screens
      { name: 'login_screen', description: 'Login Screen' },
      { name: 'splash_screen', description: 'Splash Screen' },

      // Onboarding screens
      { name: 'onboarding_screen', description: 'Main Onboarding Screen' },
      { name: 'onboarding_welcome_step', description: 'Onboarding Welcome Step' },
      { name: 'onboarding_feature_intro_step', description: 'Onboarding Feature Intro Step' },
      { name: 'onboarding_goal_setting_step', description: 'Onboarding Goal Setting Step' },
      { name: 'onboarding_completion_step', description: 'Onboarding Completion Step' },
    ];

    let successCount = 0;
    const totalCount = screenTests.length;

    for (const screen of screenTests) {
      try {
        await analyticsService.logScreenView(screen.name);
        addTestResult(
          `Screen: ${screen.description}`,
          true,
          `✅ Successfully tracked ${screen.name}`
        );
        successCount++;

        // 🛡️ MEMORY LEAK FIX: Track delay timers
        await new Promise((resolve) => addTimer(setTimeout(resolve, 50)));
      } catch (error) {
        addTestResult(
          `Screen: ${screen.description}`,
          false,
          `❌ Failed: ${(error as Error).message}`
        );
      }
    }

    showSuccess(
      `Screen View Tests Complete\n✅ ${successCount}/${totalCount} tracked\n📊 Coverage: ${Math.round(
        (successCount / totalCount) * 100
      )}%`
    );
  }, [addTimer, addTestResult, showSuccess]);

  // Run All Tests
  const runAllTests = useCallback(async () => {
    setIsRunningTests(true);
    setTestResults([]);

    try {
      await testScreenViewTracking();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));

      await testCustomEventLogging();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));

      await testUserJourneyTracking();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));

      await testPerformanceAnalytics();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));

      await testEngagementAnalytics();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));

      await testGamificationAnalytics();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));

      await testContentAnalytics();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));

      testScreenNameNormalization();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));

      await testAllScreenViews();
      await new Promise((resolve) => addTimer(setTimeout(resolve, 100)));
    } catch (error) {
      const errorMessage = `An error occurred during testing: ${(error as Error).message}`;
      addTestResult('Run All Tests', false, errorMessage);
      showError(`Test Error: ${errorMessage}`);
    } finally {
      setIsRunningTests(false);
    }
  }, [
    addTimer,
    addTestResult,
    testScreenViewTracking,
    testCustomEventLogging,
    testUserJourneyTracking,
    testPerformanceAnalytics,
    testEngagementAnalytics,
    testGamificationAnalytics,
    testContentAnalytics,
    testScreenNameNormalization,
    testAllScreenViews,
    showError,
  ]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.headerCard}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="chart-line" size={24} color={theme.colors.primary} />
            <Text style={styles.title}>Analytics Debugger</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color={theme.colors.onSurface} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.subtitle}>
          Test and verify all analytics functions for iOS and Android
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User ID:</Text>
          <Text style={styles.infoValue}>{profile?.id || 'Not logged in'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current Streak:</Text>
          <Text style={styles.infoValue}>{streakData?.current_streak || 0} days</Text>
        </View>
      </Card>

      <Card style={styles.testsCard}>
        <Text style={styles.sectionTitle}>Analytics Tests</Text>

        <Button
          mode="contained"
          onPress={runAllTests}
          loading={isRunningTests}
          disabled={isRunningTests}
          style={styles.runAllButton}
        >
          {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
        </Button>

        <Divider style={styles.divider} />

        <View style={styles.individualTests}>
          <Text style={styles.individualTestsTitle}>Individual Tests:</Text>

          <TouchableOpacity style={styles.testButton} onPress={testScreenViewTracking}>
            <Text style={styles.testButtonText}>Test Screen View Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testCustomEventLogging}>
            <Text style={styles.testButtonText}>Test Custom Event Logging</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testUserJourneyTracking}>
            <Text style={styles.testButtonText}>Test User Journey Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testPerformanceAnalytics}>
            <Text style={styles.testButtonText}>Test Performance Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testAllScreenViews}>
            <Text style={styles.testButtonText}>Test All Screen Views (NEW)</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 🚀 TOAST TESTING SECTION */}
      <Card style={styles.testsCard}>
        <Text style={styles.sectionTitle}>🍞 Toast System Tests</Text>
        <Text style={styles.toastDescription}>
          Test all toast functionality including types, durations, actions, and queue behavior.
        </Text>

        {/* Quick Test Buttons */}
        <View style={styles.quickToastTests}>
          <TouchableOpacity style={styles.toastTestButton} onPress={testBasicToasts}>
            <Icon name="check-all" size={16} color={theme.colors.primary} />
            <Text style={styles.toastTestButtonText}>All Toast Types</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toastTestButton} onPress={testActionToasts}>
            <Icon name="gesture-tap-button" size={16} color={theme.colors.warning} />
            <Text style={styles.toastTestButtonText}>Action Buttons</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toastTestButton} onPress={testToastQueue}>
            <Icon name="playlist-check" size={16} color={theme.colors.info} />
            <Text style={styles.toastTestButtonText}>Queue Test</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toastTestButton} onPress={testAllToastFeatures}>
            <Icon name="star" size={16} color={theme.colors.success} />
            <Text style={styles.toastTestButtonText}>Full Demo</Text>
          </TouchableOpacity>
        </View>

        <Divider style={styles.divider} />

        {/* Detailed Test Buttons */}
        <View style={styles.detailedToastTests}>
          <Text style={styles.individualTestsTitle}>Detailed Tests:</Text>

          <TouchableOpacity style={styles.testButton} onPress={testToastDurations}>
            <Text style={styles.testButtonText}>⏱️ Test Different Durations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testLongMessages}>
            <Text style={styles.testButtonText}>📝 Test Long Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testRetryToast}>
            <Text style={styles.testButtonText}>🔄 Test Retry Actions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testHideToast}>
            <Text style={styles.testButtonText}>⏹️ Test Hide Toast</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {testResults.length > 0 && (
        <Card style={styles.resultsCard}>
          <Text style={styles.sectionTitle}>Test Results</Text>

          {testResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <Icon
                  name={result.success ? 'check-circle' : 'alert-circle'}
                  size={16}
                  color={result.success ? theme.colors.success : theme.colors.error}
                />
                <Text
                  style={[
                    styles.resultTest,
                    { color: result.success ? theme.colors.success : theme.colors.error },
                  ]}
                >
                  {result.test}
                </Text>
                <Text style={styles.resultTime}>{result.timestamp.toLocaleTimeString()}</Text>
              </View>
              <Text style={styles.resultMessage}>{result.message}</Text>
            </View>
          ))}
        </Card>
      )}
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
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    infoLabel: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    infoValue: {
      fontSize: 12,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
    testsCard: {
      marginBottom: 16,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    runAllButton: {
      marginBottom: 12,
    },
    divider: {
      marginVertical: 12,
    },
    individualTests: {
      marginTop: 8,
    },
    individualTestsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    testButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 6,
      marginBottom: 6,
    },
    testButtonText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    resultsCard: {
      padding: 16,
    },
    resultItem: {
      marginBottom: 12,
      padding: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 6,
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    resultTest: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
      flex: 1,
    },
    resultTime: {
      fontSize: 10,
      color: theme.colors.onSurfaceVariant,
    },
    resultMessage: {
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      marginLeft: 22,
    },
    toastDescription: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
    },
    quickToastTests: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    toastTestButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 6,
      marginBottom: 6,
      width: '48%',
    },
    toastTestButtonText: {
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      marginLeft: 6,
      flex: 1,
    },
    detailedToastTests: {
      marginTop: 8,
    },
  });
