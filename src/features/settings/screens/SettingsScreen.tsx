import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getBuildNumber, getVersion } from 'react-native-device-info';

import { cleanupTemporaryFile, prepareUserExportFile, shareExportedFile } from '@/api/userDataApi';
import AboutSettings from '@/components/settings/AboutSettings';
import AccountSettings from '@/components/settings/AccountSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import DailyReminderSettings from '@/components/settings/DailyReminderSettings';
import ThrowbackReminderSettings from '@/components/settings/ThrowbackReminderSettings';
import { ScreenContent, ScreenLayout } from '@/shared/components/layout';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import { useUserProfile } from '@/shared/hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import useAuthStore from '@/store/authStore';

import { logger } from '@/utils/debugConfig';
import { AppTheme, ThemeName } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { notificationService } from '@/services/notificationService';

// Fix navigation types by extending the base interfaces
interface MainAppTabParamListFixed extends Record<string, object | undefined> {
  SettingsTab: undefined;
  DailyEntryTab: { date?: string };
  CalendarView: undefined;
}

interface RootStackParamListFixed extends Record<string, object | undefined> {
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Help: undefined;
  WhyGratitude: undefined;
}

type SettingsScreenNavigationProp = BottomTabNavigationProp<
  MainAppTabParamListFixed,
  'SettingsTab'
>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

/**
 * SettingsScreen with standardized layout and polished interactions
 * Uses TanStack Query for server state management and layout components for consistency
 */
const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [isExporting, setIsExporting] = useState(false);

  // TanStack Query - Replace Zustand profile store
  const { profile, isLoadingProfile, profileError, updateProfile, refetchProfile } =
    useUserProfile();

  const { logout } = useAuthStore();
  const { colorMode, toggleColorMode } = useTheme();

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('settings');
  }, []);

  const handleExportData = async () => {
    setIsExporting(true);
    let tempFilePath: string | undefined;

    try {
      const prepareResult = await prepareUserExportFile();

      if (!prepareResult.success || !prepareResult.filePath || !prepareResult.filename) {
        Alert.alert(
          'Dışa Aktarma Hatası',
          prepareResult.message ?? 'Veriler dışa aktarılırken bir hata oluştu.'
        );
        return;
      }

      // Store the temp file path for cleanup
      tempFilePath = prepareResult.filePath;

      const shareResult = await shareExportedFile(prepareResult.filePath, prepareResult.filename);

      if (shareResult.success) {
        // logger.debug('Data shared successfully or share dialog opened.');
      } else {
        if (shareResult.message && shareResult.message !== 'Sharing cancelled by user.') {
          Alert.alert('Paylaşım Hatası', shareResult.message);
        } else if (shareResult.message === 'Sharing cancelled by user.') {
          // logger.debug('User cancelled sharing process.');
        }
      }
    } catch (error: unknown) {
      // logger.error('Export data error:', error);
      Alert.alert(
        'Dışa Aktarma Hatası',
        error instanceof Error ? error.message : 'Beklenmedik bir hata oluştu.'
      );
    } finally {
      // Guaranteed cleanup - this will never throw due to improved cleanupTemporaryFile
      if (tempFilePath) {
        try {
          await cleanupTemporaryFile(tempFilePath);
        } catch (cleanupError) {
          // This should never happen with the improved cleanup function,
          // but adding extra safety to prevent any issues in finally block
          logger.error('Unexpected cleanup error (should not happen):', {
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            filePath: tempFilePath,
          });
        }
      }

      // Always reset the loading state
      setIsExporting(false);
    }
  };

  // TanStack Query - Helper functions for profile updates
  const handleDailyReminderUpdate = async (settings: {
    reminder_enabled: boolean;
    reminder_time?: string;
  }) => {
    try {
      // Update the profile in the database
      updateProfile(settings);

      // Also update the notification scheduling
      if (settings.reminder_enabled && settings.reminder_time) {
        const [hours, minutes] = settings.reminder_time.split(':').map(Number);
        const result = await notificationService.scheduleDailyReminder(hours, minutes, true);

        if (!result.success) {
          logger.error(
            'Failed to schedule daily reminder:',
            new Error(result.error?.message || 'Bilinmeyen hata')
          );
          Alert.alert(
            'Bildirim Hatası',
            `Hatırlatıcı zamanlanamadı: ${result.error?.message || 'Bilinmeyen hata'}`
          );
        } else {
          logger.debug('Daily reminder scheduled successfully from settings');
        }
      } else {
        // Cancel notifications if reminder is disabled
        await notificationService.cancelDailyReminders();
        logger.debug('Daily reminders cancelled from settings');
      }
    } catch (error) {
      logger.error(
        'Error updating daily reminder settings:',
        error instanceof Error ? error : new Error(String(error))
      );
      Alert.alert(
        'Ayar Hatası',
        error instanceof Error ? error.message : 'Ayarlar güncellenirken bir hata oluştu.'
      );
    }
  };

  const handleThrowbackUpdate = async (settings: {
    throwback_reminder_enabled: boolean;
    throwback_reminder_frequency: 'daily' | 'weekly' | 'monthly' | 'disabled' | undefined;
    throwback_reminder_time?: string;
  }) => {
    try {
      // Update the profile in the database (now includes throwback_reminder_time)
      updateProfile({
        throwback_reminder_enabled: settings.throwback_reminder_enabled,
        throwback_reminder_frequency: settings.throwback_reminder_frequency || 'weekly',
        throwback_reminder_time: settings.throwback_reminder_time,
      });

      // Also update the notification scheduling
      if (
        settings.throwback_reminder_enabled &&
        settings.throwback_reminder_frequency !== 'disabled'
      ) {
        // Parse time from database format (HH:MM:SS)
        const timeString = settings.throwback_reminder_time || '10:00:00';
        const [hours, minutes] = timeString.split(':').map(Number);
        const frequency = settings.throwback_reminder_frequency || 'weekly';

        const result = await notificationService.scheduleThrowbackReminder(
          hours,
          minutes,
          true,
          frequency as 'daily' | 'weekly' | 'monthly'
        );

        if (!result.success) {
          logger.error(
            'Failed to schedule throwback reminder:',
            new Error(result.error?.message || 'Bilinmeyen hata')
          );
          Alert.alert(
            'Bildirim Hatası',
            `Geçmiş hatırlatıcısı zamanlanamadı: ${result.error?.message || 'Bilinmeyen hata'}`
          );
        } else {
          logger.debug('Throwback reminder scheduled successfully from settings');
        }
      } else {
        // Cancel throwback notifications if disabled
        await notificationService.cancelThrowbackReminders();
        logger.debug('Throwback reminders cancelled from settings');
      }
    } catch (error) {
      logger.error(
        'Error updating throwback reminder settings:',
        error instanceof Error ? error : new Error(String(error))
      );
      Alert.alert(
        'Ayar Hatası',
        error instanceof Error ? error.message : 'Ayarlar güncellenirken bir hata oluştu.'
      );
    }
  };

  const handleVariedPromptsUpdate = (useVariedPrompts: boolean) => {
    updateProfile({ useVariedPrompts });
  };

  const navigateToPrivacyPolicy = () => {
    navigation.getParent<StackNavigationProp<RootStackParamListFixed>>()?.navigate('PrivacyPolicy');
  };

  const navigateToTermsOfService = () => {
    navigation
      .getParent<StackNavigationProp<RootStackParamListFixed>>()
      ?.navigate('TermsOfService');
  };

  const navigateToHelp = () => {
    navigation.getParent<StackNavigationProp<RootStackParamListFixed>>()?.navigate('Help');
  };

  const navigateToWhyGratitude = () => {
    navigation.getParent<StackNavigationProp<RootStackParamListFixed>>()?.navigate('WhyGratitude');
  };

  return (
    <ScreenLayout edges={['top']} edgeToEdge={true}>
      <ScreenContent
        isLoading={isLoadingProfile && !profile}
        error={profileError && !profile ? 'Ayarlar yüklenirken bir hata oluştu.' : null}
        onRetry={refetchProfile}
        loadingText="Ayarlar yükleniyor..."
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Ayarlar</Text>
            <Text style={styles.screenSubtitle}>Tercihlerinizi özelleştirin</Text>
          </View>
        </View>

        {/* Account Section - Moved to top */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap</Text>
          <AccountSettings onLogout={logout} username={profile?.username} />
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tercihler</Text>
          <DailyReminderSettings
            reminderEnabled={profile?.reminder_enabled ?? false}
            reminderTime={profile?.reminder_time}
            onUpdateSettings={handleDailyReminderUpdate}
          />

          <ThrowbackReminderSettings
            throwbackEnabled={profile?.throwback_reminder_enabled ?? false}
            throwbackFrequency={profile?.throwback_reminder_frequency ?? 'weekly'}
            throwbackReminderTime={profile?.throwback_reminder_time}
            onUpdateSettings={handleThrowbackUpdate}
          />

          <AppearanceSettings
            activeThemeName={colorMode as ThemeName}
            onToggleTheme={toggleColorMode}
          />

          {/* Varied Prompts Setting */}
          <View style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => handleVariedPromptsUpdate(!profile?.useVariedPrompts)}
              activeOpacity={0.7}
            >
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Icon name="lightbulb-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingTitle}>Çeşitli Öneriler</Text>
                  <Text style={styles.settingDescription}>
                    Günlük minnet yazma sayfasında yenilenebilir soru önerileri görüntüle
                  </Text>
                </View>
              </View>
              <View style={styles.toggleContainer}>
                <View
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: profile?.useVariedPrompts
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: theme.colors.surface,
                        transform: [
                          {
                            translateX: profile?.useVariedPrompts ? 22 : 2,
                          },
                        ],
                      },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veri Yönetimi</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Icon name="download-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingTitle}>Verileri Dışa Aktar</Text>
                  <Text style={styles.settingDescription}>
                    Tüm minnet günlüğü verilerinizi PDF formatında indirin
                  </Text>
                </View>
              </View>
              <View style={styles.actionContainer}>
                <ThemedButton
                  title={isExporting ? 'Aktarılıyor...' : 'Dışa Aktar'}
                  onPress={handleExportData}
                  variant="outline"
                  disabled={isExporting}
                  style={styles.exportButton}
                />
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkında</Text>
          <AboutSettings
            onNavigateToPrivacyPolicy={navigateToPrivacyPolicy}
            onNavigateToTermsOfService={navigateToTermsOfService}
            onNavigateToHelp={navigateToHelp}
            onNavigateToWhyGratitude={navigateToWhyGratitude}
          />
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.footer}>
            <Text style={styles.versionText}>
              Yeşer v{getVersion()} ({getBuildNumber()})
            </Text>
          </View>
        </View>
      </ScreenContent>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    headerSection: {
      marginBottom: theme.spacing.section,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontFamily: 'Lora-Medium',
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      letterSpacing: -0.3,
      lineHeight: 24,
    },
    footerSection: {
      marginBottom: theme.spacing.sm,
    },
    header: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    screenTitle: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
      fontWeight: '700',
    },
    screenSubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
    },
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      // 🌟 Medium primary shadow for inline setting cards
      ...getPrimaryShadow.medium(theme),
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    textContainer: {
      flex: 1,
    },
    settingTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
    },
    settingDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    toggleContainer: {
      marginLeft: theme.spacing.sm,
    },
    toggle: {
      width: 50,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      padding: 2,
    },
    toggleThumb: {
      width: 26,
      height: 26,
      borderRadius: 13,
      // ❌ Remove old elevation - inconsistent with primary shadow system
    },
    actionContainer: {
      marginLeft: theme.spacing.sm,
    },
    exportButton: {
      minWidth: 100,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    versionText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });

export default SettingsScreen;
