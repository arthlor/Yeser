import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import { getNeutralShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { useUsernameValidation } from '@/shared/hooks';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
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
import OnboardingNavHeader from '@/components/onboarding/OnboardingNavHeader';

type ThemeKey = 'light' | 'dark' | 'auto';

interface PersonalizationStepProps {
  onNext: (data: { username: string; selectedTheme: string }) => void;
  onBack: () => void;
  initialData?: {
    username?: string;
    selectedTheme?: string;
  };
}

const THEME_OPTIONS: {
  key: ThemeKey;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  { key: 'light', name: 'Açık Tema', icon: 'sunny-outline', description: 'Günün her saati için' },
  { key: 'dark', name: 'Koyu Tema', icon: 'moon-outline', description: 'Gözlerini dinlendirir' },
  { key: 'auto', name: 'Otomatik', icon: 'phone-portrait-outline', description: 'Sisteme göre' },
];

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
}) => {
  const { theme, setColorMode } = useTheme();
  const styles = createStyles(theme);

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
    <OnboardingLayout edgeToEdge={true}>
      <Animated.View style={[styles.container, containerStyle]}>
        <ScreenSection>
          <OnboardingNavHeader
            onBack={() => {
              hapticFeedback.light();
              onBack();
            }}
          />
        </ScreenSection>

        {/* Content Header */}
        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>Seni Tanıyalım! 👋</Text>
            <Text style={styles.subtitle}>
              Senin için kişiselleştirilmiş bir deneyim oluşturalım.
            </Text>
          </View>
        </ScreenSection>

        {/* Username Section */}
        <ScreenSection title="Adın Ne?">
          <View style={styles.usernameInputContainer}>
            <TextInput
              style={[
                styles.usernameInput,
                validationError ? styles.usernameInputError : undefined,
              ]}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="Örneğin: Ayşe"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={50}
              autoCapitalize="none"
              autoCorrect={false}
              accessible
              accessibilityLabel="Kullanıcı adı"
              accessibilityHint="Minnettarlık günlüğünde seni nasıl çağıralım"
            />
            {isChecking && (
              <View style={styles.usernameValidationIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
            {!isChecking && isAvailable === true && username.length >= 3 && (
              <View style={styles.usernameValidationIndicator}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              </View>
            )}
          </View>
          {validationError && <Text style={styles.errorText}>{validationError}</Text>}
          {!validationError && isAvailable === false && (
            <Text style={styles.errorText}>Bu kullanıcı adı zaten kullanılıyor</Text>
          )}
          {!validationError && !isChecking && isAvailable === true && username.length >= 3 && (
            <Text style={styles.successText}>✅ Kullanıcı adı kullanılabilir</Text>
          )}
          <View style={styles.usernameHintContainer}>
            <Text style={styles.usernameHint}>
              Bu isim günlük hatırlatıcılarda ve kişiselleştirilmiş mesajlarda kullanılacak.
            </Text>
          </View>
        </ScreenSection>

        {/* Theme Section */}
        <ScreenSection title="Tema Tercihin">
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map((themeOption) => (
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
                  <Ionicons
                    name={themeOption.icon}
                    size={22}
                    color={
                      selectedTheme === themeOption.key
                        ? theme.colors.primary
                        : theme.colors.textSecondary
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
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
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
              title="Devam Et"
              disabled={!canContinue}
              accessibilityLabel="Kişiselleştirme ayarlarını kaydet ve devam et"
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
      ...theme.typography.headlineLarge,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
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
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: Platform.OS === 'ios' ? theme.spacing.xs : 0, // Minimal vertical padding
      paddingRight: 50, // Make room for validation indicator
      fontSize: 16,
      color: theme.colors.text,
      minHeight: 48,
      height: 48, // Fixed height for consistent appearance
      textAlignVertical: 'center', // Center text vertically on Android
      includeFontPadding: false, // Remove extra font padding on Android
      // 🌟 Beautiful neutral shadow for username input
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
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    themeOptions: { gap: theme.spacing.xs },
    themeOption: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
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
      color: theme.colors.text,
      fontWeight: '600',
    },
    themeOptionTitleSelected: {
      color: theme.colors.primary,
    },
    themeOptionDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
    },
    themeOptionDescriptionSelected: {
      color: theme.colors.primary + 'CC',
    },
    footer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    // Removed button styles - handled by OnboardingButton component
  });

export default PersonalizationStep;
