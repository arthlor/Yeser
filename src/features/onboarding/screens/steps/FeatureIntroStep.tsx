import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { Ionicons } from '@expo/vector-icons';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, IconButton, Switch } from 'react-native-paper';

import { ScreenLayout, ScreenSection } from '@/shared/components/layout';

interface FeatureIntroStepProps {
  onNext: (features: FeaturePreferences) => void;
  onBack?: () => void;
  initialPreferences?: FeaturePreferences;
}

interface FeaturePreferences {
  useVariedPrompts: boolean;
  throwbackEnabled: boolean;
  throwbackFrequency: 'daily' | 'weekly' | 'monthly';
}

const THROWBACK_FREQUENCIES = [
  { key: 'daily', label: 'Her Gün', description: 'Günlük anı hatırlatmaları' },
  { key: 'weekly', label: 'Haftalık', description: 'Haftada bir anı hatırlatması' },
  { key: 'monthly', label: 'Aylık', description: 'Ayda bir anı hatırlatması' },
] as const;

export const FeatureIntroStep: React.FC<FeatureIntroStepProps> = ({
  onNext,
  onBack,
  initialPreferences,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [features, setFeatures] = useState<FeaturePreferences>({
    useVariedPrompts: initialPreferences?.useVariedPrompts ?? true,
    throwbackEnabled: initialPreferences?.throwbackEnabled ?? true,
    throwbackFrequency: initialPreferences?.throwbackFrequency ?? 'weekly',
  });

  // Simplified animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleFeatureToggle = useCallback(
    (feature: keyof FeaturePreferences, value: boolean | string) => {
      setFeatures((prev) => ({
        ...prev,
        [feature]: value,
      }));
      hapticFeedback.light();

      analyticsService.logEvent('onboarding_feature_toggled', {
        feature,
        value,
      });
    },
    []
  );

  const handleContinue = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_features_configured', {
      varied_prompts: features.useVariedPrompts,
      throwback_enabled: features.throwbackEnabled,
      throwback_frequency: features.throwbackFrequency,
    });

    onNext(features);
  }, [features, onNext]);

  return (
          <ScreenLayout edges={['top']} edgeToEdge={true}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Navigation Header */}
        {onBack && (
          <ScreenSection>
            <View style={styles.navigationHeader}>
              <IconButton
                icon="arrow-left"
                size={24}
                iconColor={theme.colors.text}
                onPress={() => {
                  hapticFeedback.light();
                  onBack();
                }}
                accessibilityLabel="Geri dön"
                style={styles.backButton}
              />
            </View>
          </ScreenSection>
        )}

        {/* Content Header */}
        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>Minnet Hatırlatıcıları ✨</Text>
            <Text style={styles.subtitle}>
              Minnettarlık deneyimini daha da zenginleştirelim. Bu özellikleri istediğin zaman açıp
              kapatabilirsin.
            </Text>
          </View>
        </ScreenSection>

        {/* Features Section */}
        <ScreenSection variant="edge-to-edge">
          {/* Varied Prompts Feature */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <View style={styles.featureIconWrapper}>
                  <Ionicons name="bulb" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.featureTitleContainer}>
                  <Text style={styles.featureTitle}>Çeşitli İlham Soruları</Text>
                  <Text style={styles.featureDescription}>
                    Her gün farklı sorularla minnettarlığını keşfet. "Bugün seni güldüren neydi?"
                    gibi yaratıcı sorular.
                  </Text>
                </View>
                <Switch
                  value={features.useVariedPrompts}
                  onValueChange={(value) => handleFeatureToggle('useVariedPrompts', value)}
                  color={theme.colors.primary}
                />
              </View>
            </View>
          </Animated.View>

          {/* Throwback Feature */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <View style={styles.featureIconWrapper}>
                  <Ionicons name="time" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.featureTitleContainer}>
                  <Text style={styles.featureTitle}>Anı Pırıltıları</Text>
                  <Text style={styles.featureDescription}>
                    Geçmişteki güzel anılarını yeniden keşfet. Eski minnettarlıklarını hatırlatan
                    bildirimler al.
                  </Text>
                </View>
                <Switch
                  value={features.throwbackEnabled}
                  onValueChange={(value) => handleFeatureToggle('throwbackEnabled', value)}
                  color={theme.colors.primary}
                />
              </View>

              {/* Throwback Frequency Options */}
              {features.throwbackEnabled && (
                <View style={styles.frequencyContainer}>
                  <Text style={styles.frequencyTitle}>Ne sıklıkla hatırlatayım?</Text>
                  <View style={styles.frequencyOptions}>
                    {THROWBACK_FREQUENCIES.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        onPress={() => handleFeatureToggle('throwbackFrequency', option.key)}
                        style={[
                          styles.frequencyOption,
                          features.throwbackFrequency === option.key &&
                            styles.frequencyOptionSelected,
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.frequencyOptionContent}>
                          <View
                            style={[
                              styles.radioButton,
                              features.throwbackFrequency === option.key &&
                                styles.radioButtonSelected,
                            ]}
                          />
                          <View style={styles.frequencyOptionText}>
                            <Text
                              style={[
                                styles.frequencyOptionLabel,
                                features.throwbackFrequency === option.key &&
                                  styles.frequencyOptionLabelSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Text
                              style={[
                                styles.frequencyOptionDescription,
                                features.throwbackFrequency === option.key &&
                                  styles.frequencyOptionDescriptionSelected,
                              ]}
                            >
                              {option.description}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Info Card */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.infoCard}>
              <View style={styles.infoContent}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.infoText}>
                  Bu ayarları istediğin zaman profil ayarlarından değiştirebilirsin. Deneyimi
                  tamamen senin kontrolünde!
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScreenSection>

        {/* Actions Section */}
        <ScreenSection>
          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleContinue}
              style={styles.continueButton}
              contentStyle={styles.buttonContentSmall}
              labelStyle={styles.buttonTextSmall}
            >
              Devam Et
            </Button>
          </View>
        </ScreenSection>
      </Animated.View>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    navigationHeader: {
      alignItems: 'flex-start',
      paddingBottom: 0,
    },
    backButton: {
      margin: 0,
      marginLeft: -theme.spacing.sm,
    },
    header: {
      alignItems: 'center',
      paddingTop: 0,
    },
    title: {
      ...theme.typography.headlineLarge,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    featureCard: {
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // Removed primary shadow
    },
    featureHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    featureIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureTitleContainer: {
      flex: 1,
    },
    featureTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.text,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    featureDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    frequencyContainer: {
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '30',
    },
    frequencyTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
      fontWeight: '600',
      marginBottom: theme.spacing.md,
    },
    frequencyOptions: {
      gap: theme.spacing.sm,
    },
    frequencyOption: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      padding: theme.spacing.md,
      // Removed primary shadow
    },
    frequencyOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '08',
      // Removed primary shadow
    },
    frequencyOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    radioButton: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: theme.colors.outline,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    frequencyOptionText: {
      flex: 1,
    },
    frequencyOptionLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
      fontWeight: '600',
    },
    frequencyOptionLabelSelected: {
      color: theme.colors.primary,
    },
    frequencyOptionDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    frequencyOptionDescriptionSelected: {
      color: theme.colors.primary + 'CC',
    },
    infoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // Removed primary shadow
    },
    infoContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    infoText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    footer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    continueButton: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
    },
    buttonContent: {
      paddingVertical: theme.spacing.xs,
    },
    buttonText: {
      ...theme.typography.bodyMedium,
      fontWeight: '600',
    },
    buttonContentSmall: {
      paddingVertical: theme.spacing.xs * 0.5,
      paddingHorizontal: theme.spacing.md,
    },
    buttonTextSmall: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
    },
  });

export default FeatureIntroStep;
