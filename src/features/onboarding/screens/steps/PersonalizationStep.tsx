import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import { getNeutralShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { useUsernameValidation } from '@/shared/hooks';
import { OnboardingMascot } from '@/features/onboarding/components/OnboardingMascot';
import { Feather } from '@expo/vector-icons';
import { OnboardingLayout } from '@/features/onboarding/components/OnboardingLayout';
import { useTranslation } from 'react-i18next';
import { OnboardingButton } from '@/features/onboarding/components/OnboardingButton';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenSection } from '@/shared/components/layout';
import OnboardingNavHeader from '@/features/onboarding/components/OnboardingNavHeader';

type ThemeKey = 'light' | 'dark' | 'auto';

interface PersonalizationStepProps {
  onNext: (data: { username: string; selectedTheme: string }) => void;
  onBack: () => void;
  initialData?: {
    username?: string;
    selectedTheme?: string;
  };
  currentStep?: number;
  totalSteps?: number;
}

// Deprecated constant (replaced by localized THEME_OPTIONS_LOCALIZED)

/**
 * 👋 SIMPLIFIED PERSONALIZATION STEP
 *
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated direct Animated.timing entrance animation
 * - Replaced with coordinated animation system
 * - Enhanced consistency with other onboarding steps
 * - Maintained all personalization functionality
 */
export const PersonalizationStep: React.FC<PersonalizationStepProps> = ({
  onNext,
  onBack,
  initialData,
  currentStep,
  totalSteps,
}) => {
  const { theme, setColorMode } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();
  const THEME_OPTIONS_LOCALIZED: {
    key: ThemeKey;
    name: string;
    icon: keyof typeof Feather.glyphMap;
    description: string;
  }[] = useMemo(
    () => [
      {
        key: 'light',
        name: t('onboarding.personalization.theme.light.name'),
        icon: 'sun',
        description: t('onboarding.personalization.theme.light.desc'),
      },
      {
        key: 'dark',
        name: t('onboarding.personalization.theme.dark.name'),
        icon: 'moon',
        description: t('onboarding.personalization.theme.dark.desc'),
      },
      {
        key: 'auto',
        name: t('onboarding.personalization.theme.auto.name'),
        icon: 'smartphone',
        description: t('onboarding.personalization.theme.auto.desc'),
      },
    ],
    [t]
  );

  const [username, setUsername] = useState(initialData?.username || '');
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>(
    (initialData?.selectedTheme as ThemeKey) || 'auto'
  );

  // Username validation hook
  const {
    isChecking,
    isAvailable,
    error: validationError,
    checkUsername,
  } = useUsernameValidation();

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
    // Use coordinated entrance animation instead of direct Animated.timing
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  const handleUsernameChange = useCallback(
    (value: string) => {
      setUsername(value);
      // Trigger real-time username availability check
      checkUsername(value);
    },
    [checkUsername]
  );

  const handleThemeSelect = useCallback(
    (themeKey: ThemeKey) => {
      setSelectedTheme(themeKey);
      hapticFeedback.light();

      // Preview the theme immediately
      setColorMode(themeKey);

      analyticsService.logEvent('onboarding_theme_selected', {
        selected_theme: themeKey,
      });
    },
    [setColorMode]
  );

  const handleContinue = useCallback(() => {
    // Check if username is valid and available
    if (validationError || isChecking || isAvailable === false) {
      return;
    }

    hapticFeedback.success();
    analyticsService.logEvent('onboarding_personalization_completed', {
      username_length: username.length,
      selected_theme: selectedTheme,
    });

    onNext({ username, selectedTheme });
  }, [username, selectedTheme, validationError, isChecking, isAvailable, onNext]);

  const canContinue =
    username.trim().length >= 3 && !validationError && !isChecking && isAvailable === true;

  // Removed debug logging

  return (
    <OnboardingLayout edgeToEdge={true} ambient="warm">
      <Animated.View style={[styles.container, containerStyle]}>
        <ScreenSection>
          <OnboardingNavHeader
            onBack={() => {
              hapticFeedback.light();
              onBack();
            }}
            currentStep={currentStep}
            totalSteps={totalSteps}
          />
        </ScreenSection>

        <OnboardingMascot source={require('@/assets/assets/mascot1.png')} delay={200} />

        {/* Content Header */}
        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>{t('onboarding.personalization.title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.personalization.subtitle')}</Text>
          </View>
        </ScreenSection>

        {/* Live greeting preview — warms up the experience with the user's name. */}
        <ScreenSection>
          <View style={styles.previewCard}>
            <Feather name="message-circle" size={16} color={theme.colors.primary} />
            <Text style={styles.previewText}>
              {username.trim().length >= 2
                ? t('onboarding.personalization.previewFilled', { name: username.trim() })
                : t('onboarding.personalization.previewEmpty')}
            </Text>
          </View>
        </ScreenSection>

        {/* Username Section */}
        <ScreenSection title={t('onboarding.personalization.sectionNameTitle')}>
          <View style={styles.usernameInputContainer}>
            <TextInput
              style={[
                styles.usernameInput,
                validationError ? styles.usernameInputError : undefined,
              ]}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder={t('onboarding.personalization.placeholderName')}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              maxLength={50}
              autoCapitalize="none"
              autoCorrect={false}
              accessible
              accessibilityLabel={t('onboarding.personalization.a11yLabelName')}
              accessibilityHint={t('onboarding.personalization.a11yHintName')}
            />
            {isChecking && (
              <View style={styles.usernameValidationIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
            {!isChecking && isAvailable === true && username.length >= 3 && (
              <View style={styles.usernameValidationIndicator}>
                <Feather name="check-circle" size={20} color={theme.colors.success} />
              </View>
            )}
          </View>
          {validationError && <Text style={styles.errorText}>{validationError}</Text>}
          {!validationError && isAvailable === false && (
            <Text style={styles.errorText}>{t('onboarding.personalization.errorTaken')}</Text>
          )}
          {!validationError && !isChecking && isAvailable === true && username.length >= 3 && (
            <Text style={styles.successText}>
              {t('onboarding.personalization.successAvailable')}
            </Text>
          )}
          <View style={styles.usernameHintContainer}>
            <Text style={styles.usernameHint}>{t('onboarding.personalization.hintUsage')}</Text>
          </View>
        </ScreenSection>

        {/* Theme Section */}
        <ScreenSection title={t('onboarding.personalization.sectionThemeTitle')}>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS_LOCALIZED.map((themeOption) => (
              <TouchableOpacity
                key={themeOption.key}
                onPress={() => handleThemeSelect(themeOption.key)}
                style={[
                  styles.themeOption,
                  selectedTheme === themeOption.key && styles.themeOptionSelected,
                ]}
                activeOpacity={0.7}
                accessible
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedTheme === themeOption.key }}
                accessibilityLabel={`${themeOption.name}: ${themeOption.description}`}
              >
                <View style={styles.themeOptionContent}>
                  <Feather
                    name={themeOption.icon}
                    size={22}
                    color={
                      selectedTheme === themeOption.key
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <View style={styles.themeOptionText}>
                    <Text
                      style={[
                        styles.themeOptionTitle,
                        selectedTheme === themeOption.key && styles.themeOptionTitleSelected,
                      ]}
                    >
                      {themeOption.name}
                    </Text>
                    <Text
                      style={[
                        styles.themeOptionDescription,
                        selectedTheme === themeOption.key && styles.themeOptionDescriptionSelected,
                      ]}
                    >
                      {themeOption.description}
                    </Text>
                  </View>
                  {selectedTheme === themeOption.key && (
                    <Feather name="check-circle" size={18} color={theme.colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScreenSection>

        {/* Actions Section */}
        <ScreenSection>
          <View style={styles.footer}>
            <OnboardingButton
              onPress={handleContinue}
              title={t('onboarding.personalization.continue')}
              disabled={!canContinue}
              accessibilityLabel={t('onboarding.personalization.continueA11y')}
            />
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
      paddingTop: 0,
    },
    title: {
      ...theme.typography.headlineMedium,
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    usernameInputContainer: {
      position: 'relative',
    },
    usernameInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: Platform.OS === 'ios' ? theme.spacing.xs : 0,
      paddingRight: 44, // Room for validation indicator
      fontSize: 15,
      color: theme.colors.onBackground,
      minHeight: 44,
      height: 44,
      textAlignVertical: 'center',
      includeFontPadding: false,
      ...getNeutralShadow.card(theme),
    },
    usernameValidationIndicator: {
      position: 'absolute',
      right: theme.spacing.md,
      top: '50%',
      transform: [{ translateY: -10 }],
    },
    usernameInputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      ...theme.typography.bodySmall,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.md,
    },
    successText: {
      ...theme.typography.bodySmall,
      color: theme.colors.success,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.md,
    },
    usernameHintContainer: {
      marginTop: theme.spacing.sm,
    },
    usernameHint: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    themeOptions: { gap: theme.spacing.xs },
    themeOption: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    themeOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '0D',
    },
    themeOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    themeOptionText: {
      flex: 1,
    },
    themeOptionTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onBackground,
      fontWeight: '600',
    },
    themeOptionTitleSelected: {
      color: theme.colors.primary,
    },
    themeOptionDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
    },
    themeOptionDescriptionSelected: {
      color: theme.colors.primary + 'CC',
    },
    footer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    previewCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + '26',
    },
    previewText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onBackground,
      flex: 1,
      fontStyle: 'italic',
      lineHeight: 20,
    },
    // Removed button styles - handled by OnboardingButton component
  });

export default PersonalizationStep;
