import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useSafeInput } from '@/shared/hooks/useSafeInput';
import { useNavigationCoordination } from '@/shared/hooks/useNavigationCoordination';
import { useLifecycleCoordination } from '@/shared/hooks/useLifecycleCoordination';
import { useRaceConditionTester } from '@/shared/hooks/useRaceConditionTester';
import { logger } from '@/utils/debugConfig';

// **RACE CONDITION DEMO**: Comprehensive integration demo
export const RaceConditionDemo: React.FC = () => {
  // **COORDINATION HOOKS**: Initialize all race condition prevention hooks
  const animations = useCoordinatedAnimations();
  const input = useSafeInput('', {
    debounceMs: 300,
    maxLength: 200,
    minLength: 1,
    validateOnChange: true,
    preventSubmissionUpdates: true,
  });
  const navigation = useNavigationCoordination();
  const lifecycle = useLifecycleCoordination();
  const tester = useRaceConditionTester();

  // **DEMO STATE**: Component state for demonstration
  const [submissionCount, setSubmissionCount] = useState(0);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isStressTestRunning, setIsStressTestRunning] = useState(false);

  // **LIFECYCLE MONITORING**: Track component lifecycle events
  useEffect(() => {
    logger.debug('RaceConditionDemo mounted', {
      isMounted: lifecycle.isMounted,
      isVisible: lifecycle.isVisible,
      isReady: lifecycle.isReady(),
    });

    return () => {
      logger.debug('RaceConditionDemo unmounting');
    };
  }, [lifecycle]);

  // **COORDINATED SUBMISSION**: Demonstrate safe async operations with all protections
  const handleCoordinatedSubmission = async () => {
    if (!input.canSubmit || input.isSubmitting) {
      animations.animateShake(); // High priority error animation
      return;
    }

    // Start submission protection
    input.setIsSubmitting(true);

    try {
      // Use lifecycle coordination for safe async execution
      const result = await lifecycle.safeAsyncExecution(async () => {
        // Simulate API call with random delay
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

        return {
          success: true,
          data: input.debouncedValue,
          timestamp: Date.now(),
          submissionId: submissionCount + 1,
        };
      }, 'mutation');

      if (result) {
        // Success animation with medium priority
        animations.animatePulse();

        setSubmissionCount((prev) => prev + 1);

        // Reset input safely
        input.resetInput();

        logger.debug('Coordinated submission successful', {
          submissionId: result.submissionId,
          data: result.data,
        });
      } else {
        // Component not ready for submission
        animations.animateShake();
        Alert.alert('Error', 'Component not ready for submission');
      }
    } catch (error) {
      // Error handling with high priority animation
      animations.animateShake();
      logger.error('Coordinated submission failed:', error as Error);
      Alert.alert('Error', 'Submission failed. Please try again.');
    } finally {
      // Always clear submission state
      input.setIsSubmitting(false);
    }
  };

  // **RAPID INTERACTION TEST**: Test coordination under rapid user interactions
  const handleRapidInteractionTest = async () => {
    const interactions = [
      () => animations.animatePulse(1),
      () => animations.animateScale(2),
      () => animations.animateEntrance(1),
      () => navigation.safeNavigate('TestScreen'),
      () => navigation.safeGoBack(),
      () => input.handleInputChange('Rapid test ' + Date.now()),
    ];

    // Execute rapid interactions to test coordination
    for (let i = 0; i < 10; i++) {
      const randomInteraction = interactions[Math.floor(Math.random() * interactions.length)];
      randomInteraction();

      // Small delay between interactions
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    setTestResults((prev) => [
      ...prev,
      `Rapid interaction test completed at ${new Date().toLocaleTimeString()}`,
    ]);
  };

  // **STRESS TEST**: Run comprehensive race condition stress testing
  const handleStressTest = async () => {
    setIsStressTestRunning(true);
    setTestResults([]);

    try {
      logger.debug('Starting comprehensive race condition stress test');

      // Run comprehensive tests with high iteration count
      await tester.runComprehensiveTests(100);

      const passRate = tester.getPassRate();
      const avgTime = tester.getAverageExecutionTime();
      const failedTests = tester.getFailedTests();

      setTestResults([
        `✅ Stress Test Complete`,
        `📊 Overall Pass Rate: ${passRate.toFixed(1)}%`,
        `⏱️ Average Execution Time: ${avgTime.toFixed(2)}ms`,
        `📈 Total Tests Run: ${tester.getTotalTestsRun()}`,
        `❌ Failed Tests: ${failedTests.length}`,
        '',
        '📋 Individual Test Results:',
        ...tester.testResults.map(
          (test) => `${test.passed ? '✅' : '❌'} ${test.name}: ${test.actualOutcome}`
        ),
      ]);

      if (passRate >= 95) {
        animations.animatePulse(2); // Success animation
      } else {
        animations.animateShake(3); // Warning animation
      }
    } catch (error) {
      logger.error('Stress test failed:', error as Error);
      animations.animateShake(3);
      setTestResults(['❌ Stress test failed: ' + (error as Error).message]);
    } finally {
      setIsStressTestRunning(false);
    }
  };

  // **NAVIGATION TEST**: Test coordinated navigation
  const handleNavigationTest = () => {
    // Test various navigation scenarios
    navigation.safeNavigate('Home');
    navigation.safeNavigate('Profile');
    navigation.safeGoBack();
    navigation.safeReplace('Settings');

    // Conditional navigation
    navigation.conditionalNavigate(() => ({ screen: 'TestScreen', params: { test: true } }), {
      requiresNoActiveNavigation: true,
    });

    setTestResults((prev) => [
      ...prev,
      `Navigation test executed at ${new Date().toLocaleTimeString()}`,
    ]);
  };

  // **ANIMATION TEST**: Test coordinated animations with different priorities
  const handleAnimationTest = () => {
    // Test priority-based animation coordination
    animations.animateEntrance(1); // Low priority
    setTimeout(() => animations.animatePulse(2), 100); // Medium priority
    setTimeout(() => animations.animateShake(3), 200); // High priority (should interrupt others)
    setTimeout(() => animations.animateScale(1), 300); // Low priority (should wait)

    setTestResults((prev) => [
      ...prev,
      `Animation priority test executed at ${new Date().toLocaleTimeString()}`,
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={[styles.header, animations.transform]}>
        <Text style={styles.title}>🛡️ Race Condition Demo</Text>
        <Text style={styles.subtitle}>Comprehensive coordination hooks integration</Text>
      </Animated.View>

      {/* LIFECYCLE STATUS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Lifecycle Status</Text>
        <View style={styles.statusGrid}>
          <Text style={styles.statusItem}>🔄 Mounted: {lifecycle.isMounted ? '✅' : '❌'}</Text>
          <Text style={styles.statusItem}>👁️ Focused: {lifecycle.isFocused ? '✅' : '❌'}</Text>
          <Text style={styles.statusItem}>👀 Visible: {lifecycle.isVisible ? '✅' : '❌'}</Text>
          <Text style={styles.statusItem}>📱 App State: {lifecycle.appState}</Text>
          <Text style={styles.statusItem}>✅ Ready: {lifecycle.isReady() ? '✅' : '❌'}</Text>
          <Text style={styles.statusItem}>
            ⚡ Active Ops: {lifecycle.getActiveOperationsCount()}
          </Text>
        </View>
      </View>

      {/* SAFE INPUT DEMO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Safe Input Demo</Text>
        <TextInput
          style={[
            styles.textInput,
            input.isSubmitting && styles.textInputDisabled,
            !input.isValid && styles.textInputError,
          ]}
          value={input.value}
          onChangeText={input.handleInputChange}
          onFocus={input.handleFocus}
          onBlur={input.handleBlur}
          placeholder="Type something to test debounced input..."
          editable={!input.isSubmitting}
          multiline
        />

        <View style={styles.inputStatus}>
          <Text style={styles.statusText}>
            📝 Current: "{input.value}" ({input.value.length}/{input.maxLength})
          </Text>
          <Text style={styles.statusText}>⏱️ Debounced: "{input.debouncedValue}"</Text>
          <Text style={styles.statusText}>
            ✅ Valid: {input.isValid ? '✅' : '❌'} | 🔄 Submitting:{' '}
            {input.isSubmitting ? '✅' : '❌'} | 📝 Changed: {input.hasChanged ? '✅' : '❌'}
          </Text>
        </View>

        <Pressable
          style={[styles.button, (!input.isValid || input.isSubmitting) && styles.buttonDisabled]}
          onPress={handleCoordinatedSubmission}
          disabled={!input.isValid || input.isSubmitting}
        >
          <Text style={styles.buttonText}>
            {input.isSubmitting ? '🔄 Submitting...' : '📤 Submit Safely'}
          </Text>
        </Pressable>

        <Text style={styles.statusText}>📊 Successful Submissions: {submissionCount}</Text>
      </View>

      {/* TESTING CONTROLS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Race Condition Tests</Text>

        <View style={styles.buttonGrid}>
          <Pressable style={styles.testButton} onPress={handleRapidInteractionTest}>
            <Text style={styles.testButtonText}>⚡ Rapid Interaction</Text>
          </Pressable>

          <Pressable style={styles.testButton} onPress={handleNavigationTest}>
            <Text style={styles.testButtonText}>🧭 Navigation Test</Text>
          </Pressable>

          <Pressable style={styles.testButton} onPress={handleAnimationTest}>
            <Text style={styles.testButtonText}>🎭 Animation Test</Text>
          </Pressable>

          <Pressable
            style={[
              styles.testButton,
              styles.stressTestButton,
              isStressTestRunning && styles.buttonDisabled,
            ]}
            onPress={handleStressTest}
            disabled={isStressTestRunning}
          >
            <Text style={[styles.testButtonText, styles.stressTestText]}>
              {isStressTestRunning ? '🔄 Testing...' : '🚀 Stress Test'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* TEST RESULTS */}
      {(testResults.length > 0 || tester.performanceMetrics) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Test Results</Text>

          {tester.performanceMetrics && (
            <View style={styles.metricsContainer}>
              <Text style={styles.metricsTitle}>📊 Performance Metrics</Text>
              <Text style={styles.metricsText}>
                ✅ Success Rate: {tester.performanceMetrics.successRate.toFixed(1)}%
              </Text>
              <Text style={styles.metricsText}>
                ⏱️ Avg Time: {tester.performanceMetrics.averageExecutionTime.toFixed(2)}ms
              </Text>
              <Text style={styles.metricsText}>
                🔍 Races Detected: {tester.performanceMetrics.racesDetected}
              </Text>
              <Text style={styles.metricsText}>
                ✅ Races Resolved: {tester.performanceMetrics.racesResolved}
              </Text>
            </View>
          )}

          <ScrollView style={styles.resultsScroll} nestedScrollEnabled>
            {testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>
                {result}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* DEMO INSTRUCTIONS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Demo Instructions</Text>
        <Text style={styles.instructionText}>
          1. **Type rapidly** in the input field to test debouncing{'\n'}
          2. **Tap Submit multiple times** to test submission protection{'\n'}
          3. **Run Rapid Interaction** to test coordination under stress{'\n'}
          4. **Run Navigation Test** to test navigation debouncing{'\n'}
          5. **Run Animation Test** to see priority-based coordination{'\n'}
          6. **Run Stress Test** for comprehensive race condition validation{'\n'}
          7. **Monitor Lifecycle Status** to see real-time coordination state
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#4a90e2',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusItem: {
    width: '50%',
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: 'white',
  },
  textInputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  textInputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  inputStatus: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  testButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  stressTestButton: {
    backgroundColor: '#dc3545',
    width: '100%',
  },
  stressTestText: {
    fontSize: 16,
  },
  metricsContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2d5a2d',
  },
  metricsText: {
    fontSize: 14,
    color: '#2d5a2d',
    marginBottom: 4,
  },
  resultsScroll: {
    maxHeight: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
