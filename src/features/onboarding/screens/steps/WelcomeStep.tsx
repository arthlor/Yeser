import { analyticsService } from '@/services/analyticsService';
import { ScreenLayout } from '@/shared/components/layout';
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

  // Enhanced animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cardsAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Track welcome step view
    analyticsService.logScreenView('onboarding_welcome_step');
    analyticsService.logEvent('onboarding_welcome_viewed');
  }, [fadeAnim, slideAnim, cardsAnim]);

  const handleGetStarted = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_welcome_continued');
    onNext();
  }, [onNext]);

  return (
    <ScreenLayout edges={['top', 'bottom']} edgeToEdge={false}>
      <View style={styles.container}>
        {/* Header Section with improved spacing */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Yeşer'e Hoş Geldin!</Text>
            <View style={styles.titleAccent} />
          </View>
          <Text style={styles.subtitle}>
            Minnettarlık yolculuğuna başlamaya hazır mısın?{'\n'}Sana özel bir deneyim hazırladık.
          </Text>
        </Animated.View>

        {/* Feature Preview Cards with enhanced design */}
        <Animated.View
          style={[
            styles.featuresSection,
            {
              opacity: cardsAnim,
              transform: [
                {
                  translateY: cardsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureText}>İlk minnettarlığını yazacaksın</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureText}>Senin için uygulamayı kişiselleştireceğiz</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="star-outline" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureText}>Bildirim tercihlerini seçeceksin</Text>
          </View>
        </Animated.View>

        {/* Encouragement Section */}
        <Animated.View
          style={[
            styles.encouragementSection,
            {
              opacity: cardsAnim,
            },
          ]}
        >
          <Text style={styles.encouragementText}>
            Bu süreç sadece birkaç dakika alacak ve sonunda seni{'\n'}tamamen yansıtan bir deneyime
            sahip olacaksın.
          </Text>
        </Animated.View>

        {/* Action Button with improved design */}
        <Animated.View
          style={[
            styles.actionSection,
            {
              opacity: cardsAnim,
              transform: [
                {
                  translateY: cardsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Button
            mode="contained"
            onPress={handleGetStarted}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonText}
          >
            Hadi Başlayalım! 🚀
          </Button>
        </Animated.View>
      </View>
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
    titleContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      ...theme.typography.headlineLarge,
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    titleAccent: {
      width: 60,
      height: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    subtitle: {
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
    featureCard: {
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
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.lg,
    },
    featureText: {
      ...theme.typography.bodyMedium,
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
      lineHeight: 22,
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
    primaryButton: {
      borderRadius: theme.borderRadius.lg,
      ...getPrimaryShadow.medium(theme),
    },
    buttonContent: {
      paddingVertical: theme.spacing.md,
    },
    buttonText: {
      ...theme.typography.bodyMedium,
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default WelcomeStep;
