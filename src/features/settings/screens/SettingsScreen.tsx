import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { config } from '@/utils/config';

import { AppTheme, ThemeName } from '@/themes/types';

import {
  cleanupTemporaryFile,
  prepareUserExportFile,
  shareExportedFile,
} from '@/features/settings/userDataApi';
import AboutSettings from '@/features/settings/components/AboutSettings';
import AppearanceSettings from '@/features/settings/components/AppearanceSettings';
import DailyGoalSettings from '@/features/settings/components/DailyGoalSettings';
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
import { useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumUpsellCard } from '@/features/subscription/components/PremiumUpsellCard';
import { ProBadge } from '@/features/subscription/components/ProBadge';
import { AppStackParamList, MainTabParamList } from '@/types/navigation';

import { logger } from '@/utils/debugConfig';

type SettingsScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'SettingsTab'>;

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
  const { isPro, checkGate } = useSubscription();

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

  const variedPromptsEnabled =
    isPro && (profile?.useVariedPrompts ?? profile?.use_varied_prompts ?? true);

  const logout = useCoreAuthStore((state) => state.logout);

  // **MINIMAL ENTRANCE**: Simple screen entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('settings');
  }, []);

  const handleExportData = async () => {
    if (!checkGate('pdf_export')) {
      return;
    }

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
      // If turning ON, check gate
      if (useVariedPrompts && !checkGate('varied_prompts')) {
        return;
      }

      updateProfile({ useVariedPrompts: useVariedPrompts });
      analyticsService.logEvent('varied_prompts_toggled', {
        enabled: useVariedPrompts,
      });
    },
    [updateProfile, checkGate]
  );

  const navigateToPrivacyPolicy = () => {
    navigation.getParent<StackNavigationProp<AppStackParamList>>()?.navigate('PrivacyPolicy');
  };

  const navigateToTermsOfService = () => {
    navigation.getParent<StackNavigationProp<AppStackParamList>>()?.navigate('TermsOfService');
  };

  const navigateToHelp = () => {
    navigation.getParent<StackNavigationProp<AppStackParamList>>()?.navigate('Help');
  };

  const navigateToWhyGratitude = () => {
    navigation.getParent<StackNavigationProp<AppStackParamList>>()?.navigate('WhyGratitude');
  };

  const navigateToCustomerCenter = () => {
    navigation.getParent<StackNavigationProp<AppStackParamList>>()?.navigate('CustomerCenter');
  };

  const navigateToMoodAnalysis = () => {
    analyticsService.logEvent('settings_open_mood_analysis');

    navigation.getParent<StackNavigationProp<AppStackParamList>>()?.navigate('MoodAnalysis');
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
  const handleLogoutPress = async () => {
    try {
      await logout();
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
    <ScreenLayout
      edges={['top']}
      edgeToEdge={true}
      density="comfortable"
      backgroundColor={theme.colors.background}
    >
      <ScreenContent
        isLoading={isLoadingProfile && !profile}
        errorObject={profileError && !profile ? profileError : null}
        onRetry={refetchProfile}
        loadingText={t('settings.loading')}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <Text style={styles.headerLabel}>{t('settings.label', 'YOUR PREFERENCES')}</Text>
            <Text style={styles.screenTitle}>{t('settings.title')}</Text>
            <Text style={styles.screenSubtitle}>{t('settings.subtitle')}</Text>
          </View>
        </View>

        {/* Premium Status Section - Visible only for Pro Users */}
        {isPro && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={navigateToCustomerCenter}
            style={[styles.section, { marginBottom: theme.spacing.md }]}
          >
            <LinearGradient
              colors={['#FCC201', '#F5A623']} // Gold gradient like ProBadge
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCard}
            >
              <View style={styles.premiumIconContainer}>
                <Icon name="crown" size={24} color={theme.colors.onPrimary} />
              </View>
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumTitle}>
                  {t('settings.premium.title', 'Premium Active')}
                </Text>
                <Text style={styles.premiumSubtitle}>
                  {t('settings.premium.subtitle', 'You have access to all features')}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={theme.colors.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Premium Upsell for Free Users */}
        {!isPro && <PremiumUpsellCard />}

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
                  <View style={styles.titleRow}>
                    <Text style={styles.settingTitle}>
                      {t('settings.appearance.inspirationTitle')}
                    </Text>
                    {!isPro && <ProBadge size="small" style={styles.badgeMargin} />}
                  </View>
                  <Text style={styles.settingDescription}>
                    {t('settings.appearance.inspirationDesc')}
                  </Text>
                </View>
              </View>
              <View style={styles.actionContainer}>
                <ThemedSwitch
                  value={variedPromptsEnabled}
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
                  <View style={styles.titleRow}>
                    <Text style={styles.settingTitle}>{t('settings.data.exportTitle')}</Text>
                    {!isPro && <ProBadge size="small" style={styles.badgeMargin} />}
                  </View>
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
            onNavigateToCustomerCenter={navigateToCustomerCenter}
            onNavigateToPrivacyPolicy={navigateToPrivacyPolicy}
            onNavigateToTermsOfService={navigateToTermsOfService}
            onNavigateToHelp={navigateToHelp}
            onNavigateToWhyGratitude={navigateToWhyGratitude}
            onNavigateToMoodAnalysis={navigateToMoodAnalysis}
          />
        </View>

        {/* Compact Account Management Section - Moved to bottom */}
        <View style={styles.section}>
          <View style={styles.compactAccountActions}>
            {/* Sign Out Button - Compact */}
            <TouchableOpacity
              style={styles.compactActionButton}
              onPress={handleLogoutPress}
              accessibilityRole="button"
              accessibilityLabel={t('settings.account.signOut')}
            >
              <Icon name="logout" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.compactActionText}>{t('settings.account.signOut')}</Text>
            </TouchableOpacity>

            {/* Delete Account Button - Compact */}
            <TouchableOpacity
              style={[styles.compactActionButton, styles.deleteActionButton]}
              onPress={handleDeleteAccountPress}
              disabled={isDeletingAccount}
              accessibilityRole="button"
              accessibilityLabel={t('settings.account.delete.button')}
            >
              <Icon
                name={isDeletingAccount ? 'loading' : 'delete-forever'}
                size={16}
                color={theme.colors.error}
              />
              <Text style={[styles.compactActionText, styles.deleteActionText]}>
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
              {t('settings.version', { version: config.app.version })}
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
      ...theme.typography.titleMedium,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      fontWeight: '600',
    },
    footerSection: {
      marginBottom: theme.spacing.sm,
    },
    header: {
      alignItems: 'flex-start',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    headerLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    screenTitle: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      marginBottom: 4,
      textAlign: 'left',
      fontWeight: '700',
      fontFamily: 'Lora-Bold',
    },
    screenSubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'left',
      lineHeight: 24,
    },
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      overflow: 'hidden',
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
      width: 32,
      height: 32,
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
      backgroundColor: theme.colors.surfaceVariant + '80',
      borderRadius: theme.borderRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant + '40',
      marginHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    compactActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      flex: 1,
      justifyContent: 'center',
      marginHorizontal: theme.spacing.xs,
      minHeight: 36,
    },
    compactActionText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.xs,
      fontWeight: '600',
    },
    deleteActionButton: {
      backgroundColor: theme.colors.surface + '00',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    },
    deleteActionText: {
      color: theme.colors.error,
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    switchLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
    badgeMargin: {
      // Using gap in titleRow for consistent spacing
    },
    premiumCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      // No border for the gradient look
      elevation: 2,
      shadowColor: theme.colors.secondary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    premiumIconContainer: {
      backgroundColor: theme.colors.onPrimary + '33',
      borderRadius: theme.borderRadius.full,
      padding: 8,
      marginRight: theme.spacing.md,
    },
    premiumTextContainer: {
      flex: 1,
    },
    premiumTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
      marginBottom: 2,
      textShadowColor: theme.colors.scrim,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    premiumSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onPrimary + 'E6',
    },
  });

export default SettingsScreen;
