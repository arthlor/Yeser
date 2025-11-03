import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { analyticsService } from '@/services/analyticsService';
import { notificationService } from '@/services/notificationService';
import { getPrimaryShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';
import { logger } from '@/utils/debugConfig';
import { ScreenSection } from '@/shared/components/layout';
import OnboardingNavHeader from '@/components/onboarding/OnboardingNavHeader';

interface NotificationPermissionStepProps {
  onNext: () => void;
  onBack: () => void;
}

/**
 * 🔔 NOTIFICATION PERMISSION STEP: Request notification permissions during onboarding
 *
 * Provides clear value proposition and educational content about daily reminders
 * while following Yeşer's design patterns and Turkish content guidelines.
 */
export const NotificationPermissionStep: React.FC<NotificationPermissionStepProps> = ({
  onNext,
  onBack,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // **COORDINATED ANIMATION SYSTEM**: Single instance for all animations
  const animations = useCoordinatedAnimations();

  const containerStyle = useMemo(
    () => ({
      opacity: animations.fadeAnim,
      transform: animations.entranceTransform,
    }),
    [animations.fadeAnim, animations.entranceTransform]
  );

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });

    // Track step view
    analyticsService.logScreenView('onboarding_notification_permission_step');
    analyticsService.logEvent('onboarding_notifications_viewed');
  }, [animations]);

  const handleEnableNotifications = useCallback(async () => {
    setIsLoading(true);
    hapticFeedback.light();

    try {
      // Request notification permissions
      const result = await notificationService.registerForPushNotificationsAsync();

      if (result.token) {
        // Success - permissions granted and token obtained
        setPermissionGranted(true);
        hapticFeedback.success();

        // Save token to backend
        const saveResult = await notificationService.saveTokenToBackend(result.token);

        if (!saveResult.ok) {
          logger.warn('Token saved but backend save failed:', {
            error: saveResult.error?.message || 'Unknown error',
          });
          // Treat RLS/duplicate cases as soft success
        }

        const preferenceResult = await notificationService.setNotificationsEnabled(true);

        if (!preferenceResult.ok) {
          logger.warn('Token saved but enabling notifications failed:', {
            error: preferenceResult.error?.message || 'Unknown error',
          });
          // Still consider this success for UX - user can re-enable in settings
        }

        // Track successful permission grant
        analyticsService.logEvent('onboarding_notifications_enabled', {
          permission_status: result.status,
          has_token: !!result.token,
        });

        // Auto-advance after brief success state
        setTimeout(() => {
          onNext();
        }, 1500);
      } else {
        // Permission denied or failed
        setPermissionGranted(false);
        hapticFeedback.error();

        // Track permission denial
        analyticsService.logEvent('onboarding_notifications_denied', {
          permission_status: result.status,
          can_ask_again: result.canAskAgain ?? false,
        });

        // For permanent denial, show educational guidance
        if (result.status === 'denied' && result.canAskAgain === false) {
          notificationService.showNotificationPermissionGuidance(false);
        }
      }
    } catch (error) {
      logger.error('Notification permission request failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setPermissionGranted(false);
      hapticFeedback.error();

      analyticsService.logEvent('onboarding_notifications_error', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onNext]);

  const handleSkip = useCallback(() => {
    hapticFeedback.light();

    // Track skip action
    analyticsService.logEvent('onboarding_notifications_skipped');

    onNext();
  }, [onNext]);

  const handleBack = useCallback(() => {
    hapticFeedback.light();
    onBack();
  }, [onBack]);

  return (
    <OnboardingLayout edgeToEdge={true}>
      <Animated.View style={[styles.container, containerStyle]}>
        <ScreenSection>
          <OnboardingNavHeader onBack={handleBack} />
        </ScreenSection>

        {/* Content Header */}
        <ScreenSection>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications-outline" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>{t('onboarding.notifications.title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.notifications.subtitle')}</Text>
          </View>
        </ScreenSection>

        {/* Benefits Section */}
        <ScreenSection>
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  {t('onboarding.notifications.benefit1Title')}
                </Text>
                <Text style={styles.benefitDescription}>
                  {t('onboarding.notifications.benefit1Desc')}
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="leaf-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  {t('onboarding.notifications.benefit2Title')}
                </Text>
                <Text style={styles.benefitDescription}>
                  {t('onboarding.notifications.benefit2Desc')}
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  {t('onboarding.notifications.benefit3Title')}
                </Text>
                <Text style={styles.benefitDescription}>
                  {t('onboarding.notifications.benefit3Desc')}
                </Text>
              </View>
            </View>
          </View>
        </ScreenSection>

        {/* Success/Error State */}
        {permissionGranted !== null && (
          <ScreenSection>
            <View
              style={[styles.statusCard, permissionGranted ? styles.successCard : styles.errorCard]}
            >
              <View style={styles.statusContent}>
                <Ionicons
                  name={permissionGranted ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={permissionGranted ? theme.colors.success : theme.colors.error}
                />
                <Text
                  style={[
                    styles.statusText,
                    permissionGranted ? styles.successText : styles.errorText,
                  ]}
                >
                  {permissionGranted
                    ? t('onboarding.notifications.statusSuccess')
                    : t('onboarding.notifications.statusSkip')}
                </Text>
              </View>
            </View>
          </ScreenSection>
        )}

        {/* Action Buttons */}
        <ScreenSection>
          <View style={styles.actionContainer}>
            {permissionGranted === null && (
              <>
                <OnboardingButton
                  onPress={handleEnableNotifications}
                  title={
                    isLoading
                      ? t('onboarding.notifications.enableLoading')
                      : t('onboarding.notifications.enable')
                  }
                  disabled={isLoading}
                  accessibilityLabel={t('onboarding.notifications.enableA11y')}
                />

                <TouchableOpacity
                  onPress={handleSkip}
                  style={styles.skipButton}
                  activeOpacity={0.7}
                  disabled={isLoading}
                  accessibilityLabel={t('onboarding.notifications.skipA11y')}
                >
                  <Text style={styles.skipButtonText}>{t('onboarding.notifications.skip')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScreenSection>

        {/* Info Footer */}
        <ScreenSection>
          <View style={styles.infoFooter}>
            <View style={styles.infoContent}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={theme.colors.onSurface}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>{t('onboarding.notifications.info')}</Text>
            </View>
          </View>
        </ScreenSection>
      </Animated.View>
    </OnboardingLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    // Navigation header moved to shared component
    header: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    iconContainer: {
      marginBottom: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.full,
      backgroundColor: `${theme.colors.primary}15`,
    },
    title: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.body1.fontSize,
      lineHeight: theme.typography.body1.lineHeight,
      color: theme.colors.onSurface,
      textAlign: 'center',
      opacity: 0.8,
    },
    benefitsContainer: {
      gap: theme.spacing.md,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      ...getPrimaryShadow.card(theme),
    },
    benefitIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.md,
      backgroundColor: `${theme.colors.primary}10`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    benefitContent: {
      flex: 1,
    },
    benefitTitle: {
      fontSize: theme.typography.body1.fontSize,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.xs,
    },
    benefitDescription: {
      fontSize: theme.typography.caption.fontSize,
      lineHeight: theme.typography.caption.lineHeight,
      color: theme.colors.onSurface,
      opacity: 0.8,
    },
    statusCard: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      ...getPrimaryShadow.card(theme),
    },
    successCard: {
      backgroundColor: `${theme.colors.success}15`,
      borderWidth: 1,
      borderColor: `${theme.colors.success}30`,
    },
    errorCard: {
      backgroundColor: `${theme.colors.error}15`,
      borderWidth: 1,
      borderColor: `${theme.colors.error}30`,
    },
    statusContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    statusText: {
      flex: 1,
      fontSize: theme.typography.body1.fontSize,
      fontWeight: '500',
    },
    successText: {
      color: theme.colors.success,
    },
    errorText: {
      color: theme.colors.error,
    },
    actionContainer: {
      gap: theme.spacing.md,
    },
    skipButton: {
      padding: theme.spacing.md,
      alignItems: 'center',
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background,
    },
    skipButtonText: {
      fontSize: theme.typography.body1.fontSize,
      fontWeight: '500',
      color: theme.colors.onSurface,
      opacity: 0.7,
    },
    infoFooter: {
      marginTop: theme.spacing.lg,
    },
    infoContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      justifyContent: 'center',
    },
    infoIcon: {
      opacity: 0.6,
    },
    infoText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.onSurface,
      opacity: 0.6,
      textAlign: 'center',
      flex: 1,
    },
  });

export default NotificationPermissionStep;
