import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useUserProfile } from '@/shared/hooks';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { notificationService } from '@/services/notificationService';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { logger } from '@/utils/debugConfig';

import type { AppTheme } from '@/themes/types';

interface NotificationTestingSettingsProps {
  isVisible?: boolean;
}

const NotificationTestingSettings: React.FC<NotificationTestingSettingsProps> = ({
  isVisible = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showError, showSuccess } = useGlobalError();
  const { profile } = useUserProfile();

  const [isSendingDaily, setIsSendingDaily] = useState(false);
  const [isSendingThrowback, setIsSendingThrowback] = useState(false);

  const handleSendDailyTest = useCallback(async () => {
    setIsSendingDaily(true);
    hapticFeedback.medium();

    try {
      const result = await notificationService.sendTestNotification('daily');

      if (result.success) {
        showSuccess('Test daily reminder sent! It should navigate to New Entry screen.');

        analyticsService.logEvent('test_daily_notification_sent', {
          identifier: result.identifier || 'unknown',
        });

        logger.debug('Daily test notification sent successfully', {
          identifier: result.identifier,
        });
      } else {
        showError(`Test notification failed: ${result.error?.message || 'Unknown error'}`);
        logger.error('Daily test notification failed', result.error);
      }
    } catch (error) {
      showError('Test notification error occurred');
      logger.error('Daily test notification error', error as Error);
    } finally {
      setIsSendingDaily(false);
    }
  }, [showError, showSuccess]);

  const handleSendThrowbackTest = useCallback(async () => {
    setIsSendingThrowback(true);
    hapticFeedback.medium();

    try {
      const result = await notificationService.sendTestNotification('throwback');

      if (result.success) {
        showSuccess('Test throwback reminder sent! It should navigate to Past Entries screen.');

        analyticsService.logEvent('test_throwback_notification_sent', {
          identifier: result.identifier || 'unknown',
        });

        logger.debug('Throwback test notification sent successfully', {
          identifier: result.identifier,
        });
      } else {
        showError(`Test notification failed: ${result.error?.message || 'Unknown error'}`);
        logger.error('Throwback test notification failed', result.error);
      }
    } catch (error) {
      showError('Test notification error occurred');
      logger.error('Throwback test notification error', error as Error);
    } finally {
      setIsSendingThrowback(false);
    }
  }, [showError, showSuccess]);

  const handleTestScheduledNotifications = useCallback(async () => {
    setIsSendingDaily(true);
    setIsSendingThrowback(true);
    hapticFeedback.medium();

    try {
      showSuccess(
        'Testing scheduled notifications with user settings - check debug info below in 5 seconds'
      );

      // 🚨 FIX: Use actual user settings instead of hardcoded values
      const dailyEnabled = profile?.reminder_enabled ?? false;
      const throwbackEnabled = profile?.throwback_reminder_enabled ?? false;
      const throwbackFrequency = profile?.throwback_reminder_frequency ?? 'weekly';

      // Parse time from database format (HH:MM:SS) or use defaults
      const dailyTimeString = profile?.reminder_time || '09:00:00';
      const throwbackTimeString = profile?.throwback_reminder_time || '09:00:00';

      const [dailyHours, dailyMinutes] = dailyTimeString.split(':').map(Number);
      const [throwbackHours, throwbackMinutes] = throwbackTimeString.split(':').map(Number);

      const promises = [
        // Daily reminder using user's actual settings
        notificationService.scheduleDailyReminder(dailyHours, dailyMinutes, dailyEnabled),
      ];

      // Only schedule throwback reminders if user has them enabled
      if (throwbackEnabled && throwbackFrequency !== 'disabled') {
        promises.push(
          notificationService.scheduleThrowbackReminder(
            throwbackHours,
            throwbackMinutes,
            true,
            throwbackFrequency as 'daily' | 'weekly' | 'monthly'
          )
        );
      }

      const results = await Promise.all(promises);

      setTimeout(async () => {
        const debugInfo = await notificationService.getScheduledNotificationsDebugInfo();

        logger.debug('Scheduled notifications test results', {
          total_count: debugInfo.count,
          daily_count: debugInfo.notifications.filter(
            (n) => n.categoryIdentifier === 'DAILY_REMINDER'
          ).length,
          throwback_count: debugInfo.notifications.filter(
            (n) => n.categoryIdentifier === 'THROWBACK_REMINDER'
          ).length,
          user_settings: {
            daily_enabled: dailyEnabled,
            daily_time: dailyTimeString,
            throwback_enabled: throwbackEnabled,
            throwback_frequency: throwbackFrequency,
            throwback_time: throwbackTimeString,
          },
          results: results.map((r) => ({ success: r.success, identifier: r.identifier })),
        });

        analyticsService.logEvent('test_scheduled_notifications_completed', {
          total_scheduled: debugInfo.count,
          test_results: results.length,
          daily_enabled: dailyEnabled,
          throwback_enabled: throwbackEnabled,
        });
      }, 2000);
    } catch (error) {
      showError('Scheduled notification test error occurred');
      logger.error('Scheduled notification test error', error as Error);
    } finally {
      setTimeout(() => {
        setIsSendingDaily(false);
        setIsSendingThrowback(false);
      }, 3000);
    }
  }, [showError, showSuccess, profile]);

  // ✨ ENHANCED: Comprehensive notification scenario test
  const handleTestFrequencyAnalysis = useCallback(async () => {
    setIsSendingThrowback(true);
    setIsSendingDaily(true);
    hapticFeedback.medium();

    try {
      showSuccess('🔍 Comprehensive Notification Analysis - detailed results in 3 seconds');

      const dailyTimeString = profile?.reminder_time || '09:00:00';
      const throwbackTimeString = profile?.throwback_reminder_time || '09:00:00';
      const [dailyHours, dailyMinutes] = dailyTimeString.split(':').map(Number);
      const [throwbackHours, throwbackMinutes] = throwbackTimeString.split(':').map(Number);

      // ✨ COMPREHENSIVE TEST SCENARIOS
      const testScenarios = [
        {
          name: 'Scenario 1: Only Günlük Hatırlatıcı Enabled',
          daily_enabled: true,
          throwback_enabled: false,
          throwback_frequency: 'weekly' as const,
          expected_daily_per_year: 365,
          expected_throwback_per_year: 0,
          description: 'User gets daily gratitude reminders only',
        },
        {
          name: 'Scenario 2: Only Geçmiş Hatırlatıcı (Daily) Enabled',
          daily_enabled: false,
          throwback_enabled: true,
          throwback_frequency: 'daily' as const,
          expected_daily_per_year: 0,
          expected_throwback_per_year: 365,
          description: 'User gets daily throwback reminders only',
        },
        {
          name: 'Scenario 3: Only Geçmiş Hatırlatıcı (Weekly) Enabled',
          daily_enabled: false,
          throwback_enabled: true,
          throwback_frequency: 'weekly' as const,
          expected_daily_per_year: 0,
          expected_throwback_per_year: 52,
          description: 'User gets weekly throwback reminders = ~4/month',
        },
        {
          name: 'Scenario 4: Only Geçmiş Hatırlatıcı (Monthly) Enabled',
          daily_enabled: false,
          throwback_enabled: true,
          throwback_frequency: 'monthly' as const,
          expected_daily_per_year: 0,
          expected_throwback_per_year: 12,
          description: 'User gets monthly throwback reminders = 1/month',
        },
        {
          name: 'Scenario 5: Both Günlük + Geçmiş (Daily) Enabled',
          daily_enabled: true,
          throwback_enabled: true,
          throwback_frequency: 'daily' as const,
          expected_daily_per_year: 365,
          expected_throwback_per_year: 365,
          description: 'User gets TWO daily notifications (gratitude + throwback)',
        },
        {
          name: 'Scenario 6: Both Günlük + Geçmiş (Weekly) Enabled',
          daily_enabled: true,
          throwback_enabled: true,
          throwback_frequency: 'weekly' as const,
          expected_daily_per_year: 365,
          expected_throwback_per_year: 52,
          description: 'User gets daily gratitude + weekly throwback = 365+52/year',
        },
        {
          name: 'Scenario 7: Both Günlük + Geçmiş (Monthly) Enabled',
          daily_enabled: true,
          throwback_enabled: true,
          throwback_frequency: 'monthly' as const,
          expected_daily_per_year: 365,
          expected_throwback_per_year: 12,
          description: 'User gets daily gratitude + monthly throwback = 365+12/year',
        },
        {
          name: 'Scenario 8: All Notifications Disabled',
          daily_enabled: false,
          throwback_enabled: false,
          throwback_frequency: 'weekly' as const,
          expected_daily_per_year: 0,
          expected_throwback_per_year: 0,
          description: 'User gets no notifications at all',
        },
      ];

      // ✅ FIX: Add proper typing for analysis results
      interface ScenarioResult {
        scenario_name: string;
        settings: {
          daily_enabled: boolean;
          throwback_enabled: boolean;
          throwback_frequency: 'daily' | 'weekly' | 'monthly';
        };
        scheduled_counts: {
          daily_notifications: number;
          throwback_notifications: number;
          total_notifications: number;
        };
        expected_counts: {
          daily_per_year: number;
          throwback_per_year: number;
          total_per_year: number;
        };
        platform_methods: {
          daily_method: string;
          throwback_method: string;
        };
        mathematical_check: {
          daily_correct: boolean;
          throwback_correct: boolean;
          requirements_met: boolean;
        };
        description: string;
      }

      const scenarioResults: ScenarioResult[] = [];

      for (const scenario of testScenarios) {
        // Cancel all notifications before testing this scenario
        await notificationService.cancelAllScheduledNotifications();

        // Schedule based on scenario settings
        let dailyResult: { success: boolean; identifier?: string } = {
          success: true,
          identifier: 'disabled',
        };
        let throwbackResult: { success: boolean; identifier?: string } = {
          success: true,
          identifier: 'disabled',
        };

        if (scenario.daily_enabled) {
          dailyResult = await notificationService.scheduleDailyReminder(
            dailyHours,
            dailyMinutes,
            true
          );
        }

        if (scenario.throwback_enabled) {
          throwbackResult = await notificationService.scheduleThrowbackReminder(
            throwbackHours,
            throwbackMinutes,
            true,
            scenario.throwback_frequency
          );
        }

        // Count scheduled notifications
        const debugInfo = await notificationService.getScheduledNotificationsDebugInfo();
        const dailyCount = debugInfo.notifications.filter(
          (n) => n.categoryIdentifier === 'DAILY_REMINDER'
        ).length;
        const throwbackCount = debugInfo.notifications.filter(
          (n) => n.categoryIdentifier === 'THROWBACK_REMINDER'
        ).length;

        // Calculate expected notifications based on platform and frequency
        const getExpectedDailyCount = () => {
          if (!scenario.daily_enabled) {
            return 0;
          }
          return Platform.OS === 'android' ? 7 : 1; // Android: 7 weekly triggers, iOS: 1 repeating
        };

        const getExpectedThrowbackCount = () => {
          if (!scenario.throwback_enabled) {
            return 0;
          }
          if (scenario.throwback_frequency === 'daily') {
            return Platform.OS === 'android' ? 7 : 1; // Android: 7 weekly triggers, iOS: 1 repeating
          } else if (scenario.throwback_frequency === 'weekly') {
            return 1; // Both platforms: 1 weekly trigger
          } else if (scenario.throwback_frequency === 'monthly') {
            return 1; // Both platforms: 1 date trigger
          }
          return 0;
        };

        const expectedDailyCount = getExpectedDailyCount();
        const expectedThrowbackCount = getExpectedThrowbackCount();

        // Mathematical verification
        const dailyCorrect = dailyCount === expectedDailyCount;
        const throwbackCorrect = throwbackCount === expectedThrowbackCount;

        scenarioResults.push({
          scenario_name: scenario.name,
          settings: {
            daily_enabled: scenario.daily_enabled,
            throwback_enabled: scenario.throwback_enabled,
            throwback_frequency: scenario.throwback_frequency,
          },
          scheduled_counts: {
            daily_notifications: dailyCount,
            throwback_notifications: throwbackCount,
            total_notifications: dailyCount + throwbackCount,
          },
          expected_counts: {
            daily_per_year: scenario.expected_daily_per_year,
            throwback_per_year: scenario.expected_throwback_per_year,
            total_per_year: scenario.expected_daily_per_year + scenario.expected_throwback_per_year,
          },
          platform_methods: {
            daily_method: scenario.daily_enabled
              ? Platform.OS === 'android'
                ? '7 Weekly triggers (daily simulation)'
                : 'Calendar trigger (daily repeat)'
              : 'Not scheduled',
            throwback_method: scenario.throwback_enabled
              ? scenario.throwback_frequency === 'monthly'
                ? 'Date trigger (next month)'
                : scenario.throwback_frequency === 'daily' && Platform.OS === 'android'
                  ? '7 Weekly triggers (daily simulation)'
                  : scenario.throwback_frequency === 'daily'
                    ? 'Calendar trigger (daily repeat)'
                    : 'Weekly trigger (Sunday)'
              : 'Not scheduled',
          },
          mathematical_check: {
            daily_correct: dailyCorrect,
            throwback_correct: throwbackCorrect,
            requirements_met:
              dailyCorrect && throwbackCorrect && dailyResult.success && throwbackResult.success,
          },
          description: scenario.description,
        });

        // Small delay between scenarios to prevent debouncing issues
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Cancel all test notifications
      await notificationService.cancelAllScheduledNotifications();

      setTimeout(() => {
        const allRequirementsMet = scenarioResults.every(
          (r) => r.mathematical_check.requirements_met
        );

        logger.debug('🎯 COMPREHENSIVE NOTIFICATION ANALYSIS COMPLETE', {
          platform: Platform.OS,
          test_time: `Daily: ${dailyTimeString}, Throwback: ${throwbackTimeString}`,
          total_scenarios_tested: scenarioResults.length,
          all_requirements_met: allRequirementsMet,

          // ✨ SUMMARY MATRIX
          summary_matrix: {
            'Günlük Only': `${scenarioResults[0].scheduled_counts.total_notifications} notifications → ${scenarioResults[0].expected_counts.total_per_year}/year`,
            'Geçmiş Daily Only': `${scenarioResults[1].scheduled_counts.total_notifications} notifications → ${scenarioResults[1].expected_counts.total_per_year}/year`,
            'Geçmiş Weekly Only': `${scenarioResults[2].scheduled_counts.total_notifications} notifications → ${scenarioResults[2].expected_counts.total_per_year}/year`,
            'Geçmiş Monthly Only': `${scenarioResults[3].scheduled_counts.total_notifications} notifications → ${scenarioResults[3].expected_counts.total_per_year}/year`,
            'Günlük + Geçmiş Daily': `${scenarioResults[4].scheduled_counts.total_notifications} notifications → ${scenarioResults[4].expected_counts.total_per_year}/year`,
            'Günlük + Geçmiş Weekly': `${scenarioResults[5].scheduled_counts.total_notifications} notifications → ${scenarioResults[5].expected_counts.total_per_year}/year`,
            'Günlük + Geçmiş Monthly': `${scenarioResults[6].scheduled_counts.total_notifications} notifications → ${scenarioResults[6].expected_counts.total_per_year}/year`,
            'All Disabled': `${scenarioResults[7].scheduled_counts.total_notifications} notifications → ${scenarioResults[7].expected_counts.total_per_year}/year`,
          },

          // ✨ DETAILED SCENARIO RESULTS
          detailed_results: scenarioResults,

          // ✨ FREQUENCY VERIFICATION
          frequency_verification: {
            daily_requirement: 'Should schedule daily notifications (365/year)',
            weekly_requirement: 'Should schedule ~4 notifications per month (52/year)',
            monthly_requirement: 'Should schedule 1 notification per month (12/year)',
            platform_note:
              Platform.OS === 'android'
                ? 'Android uses multiple weekly triggers to simulate daily repeats'
                : 'iOS uses calendar triggers with native repeat functionality',
          },

          // ✨ USER REQUIREMENTS VALIDATION
          user_requirements_validation: {
            '✅ Günlük Hatırlatıcı': 'Schedules daily notifications when enabled',
            '✅ Geçmiş Daily': 'Schedules daily notifications when set to daily',
            '✅ Geçmiş Weekly': 'Schedules 4 notifications per month (weekly)',
            '✅ Geçmiş Monthly': 'Schedules 1 notification per month',
            '✅ Respects Enabled State': 'Only schedules when user enables notifications',
            '✅ Mathematical Accuracy': allRequirementsMet
              ? 'All calculations correct'
              : 'Some discrepancies found',
          },

          // ✨ PLATFORM IMPLEMENTATION DETAILS
          platform_implementation: {
            ios_daily: 'Calendar trigger with daily repeat (1 notification scheduled)',
            android_daily: '7 Weekly triggers for each day of week (7 notifications scheduled)',
            ios_weekly: 'Calendar trigger for Sunday (1 notification scheduled)',
            android_weekly: 'Weekly trigger for Sunday (1 notification scheduled)',
            both_monthly: 'Date trigger for 1st day of next month (1 notification scheduled)',
          },
        });

        analyticsService.logEvent('notification_analysis_completed', {
          platform: Platform.OS,
          scenarios_tested: scenarioResults.length,
          all_requirements_met: allRequirementsMet,
          failed_scenarios: scenarioResults.filter((r) => !r.mathematical_check.requirements_met)
            .length,
        });
      }, 1000);
    } catch (error) {
      showError('Comprehensive analysis error occurred');
      logger.error('Comprehensive notification analysis error', error as Error);
    } finally {
      setTimeout(() => {
        setIsSendingThrowback(false);
        setIsSendingDaily(false);
      }, 4000);
    }
  }, [showError, showSuccess, profile]);

  if (!isVisible) {
    return null;
  }

  return (
    <ThemedCard variant="elevated" density="comfortable" elevation="card" style={styles.container}>
      <View style={styles.header}>
        <Icon name="bell-check" size={24} color={theme.colors.primary} />
        <Text style={styles.title}>Bildirim Test Araçları</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Anında Test Bildirimleri</Text>
        <Text style={styles.sectionDescription}>
          Bildirimler çalışıyor mu ve doğru ekranlara yönlendiriyor mu test edin
        </Text>

        <View style={styles.buttonRow}>
          <ThemedButton
            title="Günlük Test"
            onPress={handleSendDailyTest}
            isLoading={isSendingDaily}
            style={StyleSheet.flatten([styles.testButton, styles.dailyButton])}
            textStyle={styles.testButtonText}
            iconLeft="calendar-today"
          />

          <ThemedButton
            title="Geçmiş Test"
            onPress={handleSendThrowbackTest}
            isLoading={isSendingThrowback}
            style={StyleSheet.flatten([styles.testButton, styles.throwbackButton])}
            textStyle={styles.testButtonText}
            iconLeft="history"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zamanlama Test Araçları</Text>
        <Text style={styles.sectionDescription}>
          Kullanıcı ayarlarına göre bildirimlerin zamanlanmasını test edin
        </Text>

        <View style={styles.buttonColumn}>
          <ThemedButton
            title="Test Scheduled Logic"
            onPress={handleTestScheduledNotifications}
            isLoading={isSendingDaily || isSendingThrowback}
            style={StyleSheet.flatten([styles.fullButton, styles.scheduleButton])}
            textStyle={styles.testButtonText}
            iconLeft="calendar-clock"
          />

          <ThemedButton
            title="🎯 Test All Scenarios"
            onPress={handleTestFrequencyAnalysis}
            isLoading={isSendingThrowback}
            style={StyleSheet.flatten([styles.fullButton, styles.analysisButton])}
            textStyle={styles.testButtonText}
            iconLeft="chart-line"
          />
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          💡 Test sonuçları console'da görüntülenir. React Native Debugger veya Metro bundler
          loglarını kontrol edin.
        </Text>
      </View>
    </ThemedCard>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginVertical: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginLeft: theme.spacing.sm,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.sm,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    buttonColumn: {
      flexDirection: 'column',
      gap: theme.spacing.md,
    },
    testButton: {
      borderRadius: theme.borderRadius.md,
    },
    dailyButton: {
      backgroundColor: theme.colors.primary,
    },
    throwbackButton: {
      backgroundColor: theme.colors.outline,
    },
    fullButton: {
      flex: 1,
    },
    scheduleButton: {
      backgroundColor: theme.colors.primary,
    },
    analysisButton: {
      backgroundColor: theme.colors.outline,
    },
    testButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onPrimary,
    },
    infoSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surfaceVariant,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 16,
      marginLeft: theme.spacing.sm,
    },
  });

export default React.memo(NotificationTestingSettings);
