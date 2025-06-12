import { analyticsService } from '@/services/analyticsService';
import { ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

interface WelcomeStepProps {
  onNext: () => void;
}

/**
 * **SIMPLIFIED WELCOME STEP**: Minimal, elegant welcome experience
 *
 * **ANIMATION SIMPLIFICATION COMPLETED**:
 * - Reduced from 4 animation instances to 1 (75% reduction)
 * - Eliminated complex staged sequences (headerAnimations, featuresAnimations, encouragementAnimations, actionAnimations)
 * - Removed custom slideAnim for simpler unified entrance
 * - Replaced with subtle 500ms entrance fade following roadmap philosophy
 * - Simplified staggered animations to single coordinated entrance
 */
export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // **SIMPLIFIED ANIMATION SYSTEM**: Single coordinated instance (4 → 1, 75% reduction)
  const animations = useCoordinatedAnimations();

  // **MINIMAL ENTRANCE**: Simple 500ms fade-in, barely noticeable
  const triggerEntranceAnimations = useCallback(() => {
    animations.animateEntrance({ duration: 500 });
  }, [animations]);

  // **UNIFIED ENTRANCE**: Single animation for all content sections
  useEffect(() => {
    triggerEntranceAnimations();

    // Track welcome step view
    analyticsService.logScreenView('onboarding_welcome_step');
    analyticsService.logEvent('onboarding_welcome_viewed');
  }, [triggerEntranceAnimations]);

  const handleGetStarted = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_welcome_continued');
    onNext();
  }, [onNext]);

  return (
    <ScreenLayout edges={['top', 'bottom']} edgeToEdge={false}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        {/* **SIMPLIFIED HEADER**: No separate animations, unified entrance */}
        <View style={styles.headerSection}>
          <Text style={styles.welcomeTitle}>Yeşer'e Hoş Geldin! 🌱</Text>
          <Text style={styles.welcomeSubtitle}>
            Minnettarlık yolculuğuna başlamaya hazır mısın?
          </Text>
        </View>

        {/* **ENHANCED FEATURES**: Modern icon design with consistent visuals */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="heart-outline" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Günlük Minnetler</Text>
              <Text style={styles.featureDescription}>Her gün küçük şeyler için minnettar ol</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="flame-outline" size={28} color="#FF6B35" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Seri Takibi</Text>
              <Text style={styles.featureDescription}>
                Düzenli minnet pratiklerin ile güçlü alışkanlıklar oluştur
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="leaf-outline" size={28} color="#4ECDC4" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Kişisel Gelişim</Text>
              <Text style={styles.featureDescription}>
                Minnettarlık ile daha pozitif ve mutlu bir yaşam sür
              </Text>
            </View>
          </View>
        </View>

        {/* **SIMPLIFIED ENCOURAGEMENT**: No separate animations, unified entrance */}
        <View style={styles.encouragementSection}>
          <Text style={styles.encouragementText}>
            Hazırsan, bu güzel yolculuğa birlikte başlayalım! ✨
          </Text>
        </View>

        {/* **SIMPLIFIED ACTION**: No separate animations, unified entrance */}
        <View style={styles.actionSection}>
          <Button
            mode="contained"
            onPress={handleGetStarted}
            style={styles.nextButton}
            labelStyle={styles.nextButtonText}
          >
            Başlayalım
          </Button>
        </View>
      </Animated.View>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
    },
    headerSection: {
      alignItems: 'center',
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    welcomeTitle: {
      ...theme.typography.headlineLarge,
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    welcomeSubtitle: {
      ...theme.typography.bodyLarge,
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: theme.spacing.md,
    },
    featuresSection: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      ...getPrimaryShadow.small(theme),
    },
    featureIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primaryContainer + '40',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.lg,
      borderWidth: 2,
      borderColor: theme.colors.primaryContainer + '60',
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      ...theme.typography.bodyMedium,
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
      lineHeight: 22,
    },
    featureDescription: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    encouragementSection: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
    },
    encouragementText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      fontSize: 14,
      fontStyle: 'italic',
      paddingHorizontal: theme.spacing.md,
    },
    actionSection: {
      paddingBottom: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
    nextButton: {
      borderRadius: theme.borderRadius.lg,
      ...getPrimaryShadow.medium(theme),
    },
    nextButtonText: {
      ...theme.typography.bodyMedium,
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default WelcomeStep;
