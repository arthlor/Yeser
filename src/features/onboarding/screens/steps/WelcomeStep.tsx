import { analyticsService } from '@/services/analyticsService';
import { ScreenLayout, ScreenSection } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { Ionicons } from '@expo/vector-icons';

import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Simplified animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Track welcome step view
    analyticsService.logEvent('onboarding_welcome_viewed');
  }, []);

  const handleGetStarted = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_welcome_continued');
    onNext();
  }, [onNext]);

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
        {/* Welcome Content */}
        <ScreenSection spacing="large">
          <View style={styles.contentSection}>
            <Text style={styles.title}>Yeşer'e Hoş Geldin! ✨</Text>
            <Text style={styles.subtitle}>
              Minnettarlık yolculuğuna başlamaya hazır mısın? Sana özel bir deneyim hazırladık.
            </Text>
          </View>
        </ScreenSection>

        {/* Feature Preview Cards */}
        <ScreenSection spacing="medium">
          <View style={styles.previewSection}>
            <View style={styles.previewCard}>
              <View style={styles.previewContent}>
                <View style={styles.previewIconWrapper}>
                  <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.previewText}>İlk minnettarlığını yazacaksın</Text>
              </View>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewContent}>
                <View style={styles.previewIconWrapper}>
                  <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.previewText}>Senin için uygulamayı kişiselleştireceğiz</Text>
              </View>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewContent}>
                <View style={styles.previewIconWrapper}>
                  <Ionicons name="star-outline" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.previewText}>Bildirim tercihlerini seçeceksin</Text>
              </View>
            </View>
          </View>
        </ScreenSection>

        {/* Encouragement Text */}
        <ScreenSection spacing="medium">
          <Text style={styles.encouragement}>
            Bu süreç sadece birkaç dakika alacak ve sonunda seni tamamen yansıtan bir deneyime sahip
            olacaksın.
          </Text>
        </ScreenSection>

        {/* Action Buttons */}
        <ScreenSection spacing="large">
          <View style={styles.actionSection}>
            <Button
              mode="contained"
              onPress={handleGetStarted}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonText}
            >
              Hadi Başlayalım! 🚀
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
    contentSection: {
      alignItems: 'center',
    },
    title: {
      ...theme.typography.headlineLarge,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      fontWeight: 'bold',
      lineHeight: 36,
    },
    subtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 26,
    },
    previewSection: {
      width: '100%',
      gap: theme.spacing.sm,
    },
    previewCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // 🌟 Beautiful primary shadow for preview cards (no react-native-paper conflicts)
      ...getPrimaryShadow.small(theme),
    },
    previewContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    previewIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    previewText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
      flex: 1,
    },
    encouragement: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      fontStyle: 'italic',
    },
    actionSection: {
      alignItems: 'center',
    },
    primaryButton: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
    },
    buttonContent: {
      paddingVertical: theme.spacing.xs,
    },
    buttonText: {
      ...theme.typography.bodyMedium,
      fontWeight: 'bold',
    },
  });

export default WelcomeStep;
