import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { analyticsService } from '@/services/analyticsService';
import { getPrimaryShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';

interface CompletionStepProps {
  onComplete: () => void;
  onBack: () => void;
  userSummary: {
    username: string;
    dailyGoal: number;
    selectedTheme: string;
    featuresEnabled: string[];
  };
}

export const CompletionStep: React.FC<CompletionStepProps> = ({
  onComplete,
  onBack,
  userSummary,
}) => {
  const { theme } = useTheme();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const sparkleRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Complex entrance animation sequence
    Animated.sequence([
      // Initial fade and slide in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      // Delayed celebration animation
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous sparkle rotation
    const rotateAnimation = Animated.loop(
      Animated.timing(sparkleRotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    // Track completion
    analyticsService.logEvent('onboarding_completed', {
      username_length: userSummary.username.length,
      daily_goal: userSummary.dailyGoal,
      selected_theme: userSummary.selectedTheme,
      features_count: userSummary.featuresEnabled.length,
    });

    return () => {
      rotateAnimation.stop();
    };
  }, [userSummary.username, userSummary.dailyGoal, userSummary.selectedTheme, userSummary.featuresEnabled, fadeAnim, slideAnim, scaleAnim, celebrationAnim, sparkleRotation]);

  const handleStartJourney = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_journey_started');
    onComplete();
  }, [onComplete]);

  const getGoalText = () => {
    if (userSummary.dailyGoal === 0) {
      return 'Özel hedef';
    }
    return `Günde ${userSummary.dailyGoal} minnettarlık ifadesi`;
  };

  const getThemeText = () => {
    const themeMap = {
      light: 'Açık Tema',
      dark: 'Koyu Tema',
      auto: 'Otomatik Tema',
    };
    return (
      themeMap[userSummary.selectedTheme as keyof typeof themeMap] || userSummary.selectedTheme
    );
  };

  const sparkleRotate = sparkleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Navigation Header */}
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
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Celebration Header */}
          <Animated.View
            style={[
              styles.celebrationContainer,
              {
                opacity: celebrationAnim,
                transform: [
                  {
                    scale: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.congratsTitle}>Tebrikler {userSummary.username}! 🎉</Text>
            <Text style={styles.congratsSubtitle}>
              Minnettarlık yolculuğuna başlamaya hazırsın! Senin için özel olarak hazırlanmış
              deneyimin burada.
            </Text>
          </Animated.View>

          {/* Summary Card */}
          <Animated.View
            style={[
              {
                opacity: celebrationAnim,
                transform: [
                  {
                    translateY: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Senin Profilin</Text>

              <View style={styles.summaryItems}>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryIconWrapper}>
                    <Ionicons name="person" size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.summaryText}>{userSummary.username}</Text>
                </View>

                <View style={styles.summaryItem}>
                  <View style={styles.summaryIconWrapper}>
                    <Ionicons name="golf" size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.summaryText}>{getGoalText()}</Text>
                </View>

                <View style={styles.summaryItem}>
                  <View style={styles.summaryIconWrapper}>
                    <Ionicons name="color-palette" size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.summaryText}>{getThemeText()}</Text>
                </View>

                {userSummary.featuresEnabled.length > 0 && (
                  <View style={styles.summaryItem}>
                    <View style={styles.summaryIconWrapper}>
                      <Ionicons name="star" size={16} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.summaryText}>
                      {userSummary.featuresEnabled.join(', ')} aktif
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Encouragement */}
          <Animated.View
            style={[
              styles.encouragementContainer,
              {
                opacity: celebrationAnim,
                transform: [
                  {
                    translateY: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.encouragementText}>
              🌱 Minnettarlık bir alışkanlıktır. Her gün birkaç dakika ayırarak yaşamının güzel
              yanlarını fark etmeye başla.
            </Text>
            <Text style={styles.encouragementSubtext}>
              Unutma: Küçük adımlar büyük değişimlere yol açar.
            </Text>
          </Animated.View>

          {/* Start Button */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: celebrationAnim,
                transform: [
                  {
                    scale: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Button
              mode="contained"
              onPress={handleStartJourney}
              style={styles.startButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonText}
              icon={({ size }) => (
                <Ionicons name="arrow-forward" size={size} color={theme.colors.onPrimary} />
              )}
            >
              Yolculuğuma Başla
            </Button>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    navigationHeader: {
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.page,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    backButton: {
      margin: 0,
      marginLeft: -theme.spacing.sm,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.page,
      paddingTop: 0,
      paddingBottom: theme.spacing.xxxl,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
    },
    celebrationContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    congratsTitle: {
      ...theme.typography.headlineLarge,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    congratsSubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: theme.spacing.md,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // 🌟 Beautiful primary shadow for summary card (no react-native-paper conflicts)
      ...getPrimaryShadow.card(theme),
    },
    summaryTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.text,
      fontWeight: '600',
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    summaryItems: {
      gap: theme.spacing.md,
    },
    summaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
    },
    summaryIconWrapper: {
      width: theme.spacing.xl,
      height: theme.spacing.xl,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    summaryText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.text,
      flex: 1,
    },
    encouragementContainer: {
      marginBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.md,
    },
    encouragementText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.sm,
    },
    encouragementSubtext: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    buttonContainer: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    startButton: {
      width: '100%',
      borderRadius: theme.borderRadius.md,
      // 🌟 Beautiful primary shadow for start button
      ...getPrimaryShadow.floating(theme),
    },
    buttonContent: {
      paddingVertical: theme.spacing.sm,
    },
    buttonText: {
      ...theme.typography.bodyMedium,
    },
  });

export default CompletionStep;
