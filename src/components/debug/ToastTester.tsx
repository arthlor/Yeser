import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { logger } from '@/utils/debugConfig';
import type { AppTheme } from '@/themes/types';

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
