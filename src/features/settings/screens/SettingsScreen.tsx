import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getVersion } from 'react-native-device-info';

import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme, ThemeName } from '@/themes/types';

import { cleanupTemporaryFile, prepareUserExportFile, shareExportedFile } from '@/api/userDataApi';
import AboutSettings from '@/components/settings/AboutSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import DailyGoalSettings from '@/components/settings/DailyGoalSettings';
import { NotificationSettings } from '../components/NotificationSettings';
import { ScreenContent, ScreenLayout } from '@/shared/components/layout';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';
import { useUserProfile } from '@/shared/hooks';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { analyticsService } from '@/services/analyticsService';
import useAuthStore from '@/store/authStore';

import { logger } from '@/utils/debugConfig';

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
  const { theme, colorMode, toggleColorMode } = useTheme();
  const { handleMutationError } = useGlobalError();
  const { showError: showToastError } = useToast();
  const styles = createStyles(theme);

  // **COORDINATED ANIMATION**: Add minimal entrance animation for consistency
  const animations = useCoordinatedAnimations();

  const [isExporting, setIsExporting] = useState(false);

  // TanStack Query - Replace Zustand profile store
  const {
    profile,
    isLoadingProfile,
    profileError,
    updateProfile,
    refetchProfile,
    deleteAccount,
    isDeletingAccount,
  } = useUserProfile();

  const { logout } = useAuthStore();

  // **MINIMAL ENTRANCE**: Simple screen entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

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
        handleMutationError(
          new Error(prepareResult.message ?? 'Veriler dışa aktarılırken bir hata oluştu.'),
          'veri dışa aktarma'
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
          handleMutationError(
            new Error(`Paylaşım hatası: ${shareResult.message}`),
            'veri paylaşma'
          );
        } else if (shareResult.message === 'Sharing cancelled by user.') {
          // logger.debug('User cancelled sharing process.');
        }
      }
    } catch (error: unknown) {
      // logger.error('Export data error:', error);
      handleMutationError(error, 'veri dışa aktarma');
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
  const handleDailyGoalUpdate = useCallback(
    (dailyGoal: number) => {
      updateProfile({ daily_gratitude_goal: dailyGoal });

      analyticsService.logEvent('daily_goal_updated_from_settings', {
        old_goal: profile?.daily_gratitude_goal || 3,
        new_goal: dailyGoal,
      });
    },
    [updateProfile, profile?.daily_gratitude_goal]
  );

  const handleVariedPromptsToggle = useCallback(
    (useVariedPrompts: boolean) => {
      updateProfile({ useVariedPrompts: useVariedPrompts });
      analyticsService.logEvent('varied_prompts_toggled', {
        enabled: useVariedPrompts,
      });
    },
    [updateProfile]
  );

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

  // Account management handlers
  const handleLogoutPress = () => {
    try {
      logout();
    } catch {
      showToastError('Çıkış işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem kalıcıdır ve geri alınamaz. Tüm verileriniz silinecektir. Devam etmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: confirmAccountDeletion,
        },
      ]
    );
  };

  const confirmAccountDeletion = () => {
    deleteAccount(undefined, {
      onSuccess: (data) => {
        showToastError(data.message || 'Hesabınız başarıyla silindi.');
      },
      onError: (_error) => {
        showToastError(
          'Hesap silme işlemi başarısız oldu. Lütfen tekrar deneyin veya destek ile iletişime geçin.'
        );
      },
    });
  };

  return (
    <ScreenLayout edges={['top']} edgeToEdge={true}>
      <ScreenContent
        isLoading={isLoadingProfile && !profile}
        errorObject={profileError && !profile ? profileError : null}
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

        {/* User Profile Section - Compact username display only */}
        {profile?.username && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kullanıcı</Text>
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.iconContainer}>
                    <Icon name="account-circle" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.settingTitle}>Kullanıcı Adı</Text>
                    <Text style={styles.settingDescription}>{profile.username}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hedef</Text>
          <DailyGoalSettings
            currentGoal={profile?.daily_gratitude_goal ?? 3}
            onUpdateGoal={handleDailyGoalUpdate}
          />
        </View>

        {/* Notification Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirimler</Text>
          <View style={styles.settingCard}>
            <NotificationSettings />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Görünüm</Text>
          <AppearanceSettings
            activeThemeName={colorMode as ThemeName}
            onToggleTheme={toggleColorMode}
          />
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Icon name="lightbulb-on-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingTitle}>İlham al</Text>
                  <Text style={styles.settingDescription}>
                    "Minnet Ekle" sayfasında çeşitli ilhamlar göster.
                  </Text>
                </View>
              </View>
              <View style={styles.actionContainer}>
                <ThemedSwitch
                  value={profile?.use_varied_prompts ?? true}
                  onValueChange={handleVariedPromptsToggle}
                />
              </View>
            </View>
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

        {/* Compact Account Management Section - Moved to bottom */}
        <View style={styles.section}>
          <View style={styles.compactAccountActions}>
            {/* Sign Out Button - Compact */}
            <TouchableOpacity style={styles.compactActionButton} onPress={handleLogoutPress}>
              <Icon name="logout" size={18} color={theme.colors.error} />
              <Text style={styles.compactActionText}>Hesaptan Çık</Text>
            </TouchableOpacity>

            {/* Delete Account Button - Compact */}
            <TouchableOpacity
              style={[styles.compactActionButton, styles.deleteActionButton]}
              onPress={handleDeleteAccountPress}
              disabled={isDeletingAccount}
            >
              <Icon
                name={isDeletingAccount ? 'loading' : 'delete-forever'}
                size={18}
                color={theme.colors.error}
              />
              <Text style={styles.compactActionText}>
                {isDeletingAccount ? 'Siliniyor...' : 'Hesabımı Sil'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.footer}>
            <Text style={styles.versionText}>Yeşer v{getVersion()}</Text>
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
    compactAccountActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      ...getPrimaryShadow.small(theme),
    },
    compactActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      flex: 1,
      justifyContent: 'center',
      marginHorizontal: theme.spacing.xs,
    },
    compactActionText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.error,
      marginLeft: theme.spacing.sm,
      fontWeight: '500',
    },
    deleteActionButton: {
      backgroundColor: theme.colors.errorContainer + '20',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginVertical: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    switchLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
  });

export default SettingsScreen;
