import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getVersion } from 'react-native-device-info';
import { useTranslation } from 'react-i18next';

import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme, ThemeName } from '@/themes/types';

import { cleanupTemporaryFile, prepareUserExportFile, shareExportedFile } from '@/api/userDataApi';
import AboutSettings from '@/components/settings/AboutSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import DailyGoalSettings from '@/components/settings/DailyGoalSettings';
import { NotificationSettings } from '../components/NotificationSettings';
import AvatarPickerRow from '../components/AvatarPickerRow';
import { LanguageSettings } from '../components/LanguageSettings';
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
  const { t } = useTranslation();

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
    uploadAvatar,
    deleteAvatar,
    getSizedAvatarUrl,
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
          new Error(prepareResult.message ?? t('settings.data.exportError')),
          'export data'
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
          handleMutationError(new Error(`Share error: ${shareResult.message}`), 'share data');
        } else if (shareResult.message === 'Sharing cancelled by user.') {
          // logger.debug('User cancelled sharing process.');
        }
      }
    } catch (error: unknown) {
      // logger.error('Export data error:', error);
      handleMutationError(error, 'export data');
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
  // Avatar helpers
  const [awaitedAvatarUrl, setAwaitedAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const url = await getSizedAvatarUrl({ path: profile?.avatar_path ?? null, size: 96 });
      if (mounted) {
        setAwaitedAvatarUrl(url);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [getSizedAvatarUrl, profile?.avatar_path]);

  const handlePickAvatar = useCallback(async () => {
    type ImagePickerLike = {
      requestMediaLibraryPermissionsAsync: () => Promise<{ status: 'granted' | 'denied' }>;
      launchImageLibraryAsync: (options: {
        mediaTypes?: unknown;
        allowsEditing?: boolean;
        aspect?: [number, number];
        quality?: number;
      }) => Promise<{ canceled: boolean; assets?: Array<{ uri: string }> }>;
      MediaTypeOptions: { Images: unknown };
    };
    try {
      const moduleName = 'expo-image-picker';
      const imagePicker: ImagePickerLike = (await import(moduleName)) as unknown as ImagePickerLike;
      const perm = await imagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          t('shared.media.permissions.photos.title'),
          t('shared.media.permissions.photos.message')
        );
        return;
      }
      const result = await imagePicker.launchImageLibraryAsync({
        mediaTypes: imagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const uri = result.assets[0].uri;
      await uploadAvatar(uri);
      const url = await getSizedAvatarUrl({ path: profile?.avatar_path ?? null, size: 96 });
      setAwaitedAvatarUrl(url);
      await refetchProfile();
    } catch {
      Alert.alert(
        t('shared.media.imagePicker.missingTitle'),
        t('shared.media.imagePicker.missingMessage')
      );
    }
  }, [getSizedAvatarUrl, profile?.avatar_path, refetchProfile, uploadAvatar, t]);

  const handleRemoveAvatar = useCallback(async () => {
    await deleteAvatar(profile?.avatar_path ?? null);
    setAwaitedAvatarUrl(null);
    await refetchProfile();
  }, [deleteAvatar, profile?.avatar_path, refetchProfile]);

  // Account management handlers
  const handleLogoutPress = () => {
    try {
      logout();
    } catch {
      showToastError(t('settings.account.signOutError'));
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(t('settings.account.delete.dialogTitle'), t('settings.account.delete.dialogBody'), [
      {
        text: t('settings.account.delete.cancel'),
        style: 'cancel',
      },
      {
        text: t('settings.account.delete.confirm'),
        style: 'destructive',
        onPress: confirmAccountDeletion,
      },
    ]);
  };

  const confirmAccountDeletion = () => {
    deleteAccount(undefined, {
      onSuccess: (data) => {
        showToastError(data.message || t('settings.account.delete.success'));
      },
      onError: (_error) => {
        showToastError(t('settings.account.delete.error'));
      },
    });
  };

  return (
    <ScreenLayout edges={['top']} edgeToEdge={true} backgroundColor={theme.colors.surface}>
      <ScreenContent
        isLoading={isLoadingProfile && !profile}
        errorObject={profileError && !profile ? profileError : null}
        onRetry={refetchProfile}
        loadingText={t('settings.loading')}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <Text style={styles.screenTitle}>{t('settings.title')}</Text>
            <Text style={styles.screenSubtitle}>{t('settings.subtitle')}</Text>
          </View>
        </View>

        {/* User Profile Section with Avatar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.sections.user')}</Text>
          <AvatarPickerRow
            username={profile?.username}
            avatarUrl={awaitedAvatarUrl}
            onPick={handlePickAvatar}
            onRemove={handleRemoveAvatar}
          />
          {profile?.username && (
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.iconContainer}>
                    <Icon name="account-circle" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.settingTitle}>{t('settings.user.usernameTitle')}</Text>
                    <Text style={styles.settingDescription}>{profile.username}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.sections.goal')}</Text>
          <DailyGoalSettings
            currentGoal={profile?.daily_gratitude_goal ?? 3}
            onUpdateGoal={handleDailyGoalUpdate}
          />
        </View>

        {/* Notification Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.sections.notifications')}</Text>
          <View style={styles.settingCard}>
            <NotificationSettings />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.sections.appearance')}</Text>
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
                  <Text style={styles.settingTitle}>
                    {t('settings.appearance.inspirationTitle')}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {t('settings.appearance.inspirationDesc')}
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

        {/* Language Section */}
        <View style={styles.section}>
          <LanguageSettings />
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.sections.data')}</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Icon name="download-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingTitle}>{t('settings.data.exportTitle')}</Text>
                  <Text style={styles.settingDescription}>{t('settings.data.exportDesc')}</Text>
                </View>
              </View>
              <View style={styles.actionContainer}>
                <ThemedButton
                  title={isExporting ? t('settings.data.exporting') : t('settings.data.export')}
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
          <Text style={styles.sectionTitle}>{t('settings.sections.about')}</Text>
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
              <Text style={styles.compactActionText}>{t('settings.account.signOut')}</Text>
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
                {isDeletingAccount
                  ? t('settings.account.delete.deleting')
                  : t('settings.account.delete.button')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.footer}>
            <Text style={styles.versionText}>
              {t('settings.version', { version: getVersion() })}
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
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
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
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
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
