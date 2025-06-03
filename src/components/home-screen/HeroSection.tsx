import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

import QuickAddGratitude from './QuickAddGratitude';
import StreakShowcase from './StreakShowcase';

interface HeroSectionProps {
  greeting: string;
  username?: string | null;
  currentCount: number;
  dailyGoal: number;
  currentStreak: number;
  longestStreak?: number;
  streakLoading?: boolean;
  onQuickAdd: (text: string) => Promise<void>;
  onStreakPress?: () => void;
  isLoading?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  greeting,
  username,
  currentCount,
  dailyGoal,
  currentStreak,
  longestStreak,
  streakLoading,
  onQuickAdd,
  onStreakPress,
  isLoading,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Animation values for enhanced entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const celebrationScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    // Progress animation
    Animated.timing(progressAnim, {
      toValue: currentCount / dailyGoal,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [currentCount, dailyGoal, progressAnim]);

  useEffect(() => {
    // Celebration animation when goal is reached
    if (currentCount >= dailyGoal && currentCount > 0) {
      Animated.sequence([
        Animated.timing(celebrationScale, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentCount, dailyGoal, celebrationScale]);

  const getTimeBasedElements = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 8) {
      return { icon: '🌅', timeText: 'Erken saatlerde', mood: 'fresh' };
    } else if (hour >= 8 && hour < 12) {
      return { icon: '☀️', timeText: 'Sabah enerjisiyle', mood: 'energetic' };
    } else if (hour >= 12 && hour < 15) {
      return { icon: '🌞', timeText: 'Öğlen saatlerinde', mood: 'bright' };
    } else if (hour >= 15 && hour < 18) {
      return { icon: '🌤️', timeText: 'İkindi vakti', mood: 'calm' };
    } else if (hour >= 18 && hour < 21) {
      return { icon: '🌆', timeText: 'Akşam saatlerinde', mood: 'warm' };
    } else {
      return { icon: '🌙', timeText: 'Gece sessizliğinde', mood: 'peaceful' };
    }
  };

  const getContextualGreeting = () => {
    const timeElements = getTimeBasedElements();
    const displayName = username || 'Yeşeren Kalbi';

    if (currentCount >= dailyGoal) {
      return {
        primary: `${timeElements.icon} Harika, ${displayName}!`,
        secondary: 'Bugünkü hedefinizi tamamladınız! 🎉',
        accent: 'Başarılı bir gün geçiriyorsunuz',
      };
    }

    if (currentCount > 0) {
      return {
        primary: `${timeElements.icon} ${greeting}, ${displayName}`,
        secondary: `${timeElements.timeText} devam ediyorsunuz`,
        accent: 'Güzel ilerleme kaydediyorsunuz! 💫',
      };
    }

    return {
      primary: `${timeElements.icon} ${greeting}, ${displayName}`,
      secondary: `${timeElements.timeText} yeni başlangıçlar yapın`,
      accent: 'Bugünün ilk şükranını bekliyoruz ✨',
    };
  };

  const getMotivationalSubtext = () => {
    if (currentCount === 0) {
      return {
        main: 'Bugünün ilk şükranını ekleyerek güne başlayın',
        sub: 'Küçük adımlar, büyük değişimler yaratır',
      };
    }

    if (currentCount >= dailyGoal) {
      return {
        main: 'Günlük hedefinizi tamamladınız! 🎊',
        sub: 'İstersen daha fazla şükran ekleyebilirsiniz',
      };
    }

    const remaining = dailyGoal - currentCount;
    const percentage = Math.round((currentCount / dailyGoal) * 100);

    return {
      main: `Hedefe ${remaining} şükran kaldı (${percentage}% tamamlandı)`,
      sub: 'Her şükran, kalbinizi daha da güçlendirir',
    };
  };

  const getProgressColor = () => {
    if (currentCount >= dailyGoal) return theme.colors.success || '#4CAF50';
    if (currentCount >= dailyGoal * 0.7) return theme.colors.warning || '#FF9800';
    return theme.colors.primary;
  };

  const greeting_data = getContextualGreeting();
  const motivation = getMotivationalSubtext();
  const progressColor = getProgressColor();
  const progressPercentage = Math.min((currentCount / dailyGoal) * 100, 100);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: celebrationScale }],
        },
      ]}
    >
      {/* Enhanced Header with contextual elements */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.primaryGreeting}>{greeting_data.primary}</Text>
          <Text style={styles.secondaryGreeting}>{greeting_data.secondary}</Text>
          <Text style={styles.accentText}>{greeting_data.accent}</Text>
        </View>

        {/* Motivation Section */}
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationMain}>{motivation.main}</Text>
          <Text style={styles.motivationSub}>{motivation.sub}</Text>
        </View>
      </View>

      {/* Minimalistic Progress Display */}
      <View style={styles.progressSection}>
        <View style={styles.progressNumbers}>
          <Text style={[styles.currentCount, { color: progressColor }]}>{currentCount}</Text>
          <Text style={styles.goalCount}>/ {dailyGoal}</Text>
          <Text style={[styles.percentageText, { color: progressColor }]}>
            ({Math.round(progressPercentage)}%)
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: progressColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <Text style={[styles.progressStatus, { color: progressColor }]}>
          {currentCount >= dailyGoal
            ? '🎉 Tamamlandı!'
            : `${dailyGoal - currentCount} şükran kaldı`}
        </Text>
      </View>

      {/* Prominent Streak Showcase */}
      <View style={styles.streakContainer}>
        <StreakShowcase
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          isLoading={streakLoading}
          onPress={onStreakPress}
        />
      </View>

      {/* Enhanced Quick Add Section */}
      <View style={styles.quickAddContainer}>
        <QuickAddGratitude onSubmit={onQuickAdd} isLoading={isLoading} />
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    greetingContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    primaryGreeting: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    secondaryGreeting: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      letterSpacing: 0.2,
      lineHeight: 22,
    },
    accentText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.primary,
      textAlign: 'center',
      letterSpacing: 0.3,
      lineHeight: 20,
    },
    motivationContainer: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant + '60',
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
    },
    motivationMain: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      lineHeight: 21,
    },
    motivationSub: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      letterSpacing: 0.1,
    },
    progressSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
    },
    progressNumbers: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: theme.spacing.md,
    },
    currentCount: {
      fontSize: 48,
      fontWeight: '900',
      letterSpacing: -2,
    },
    goalCount: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginLeft: 4,
    },
    percentageText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
      opacity: 0.8,
    },
    progressBarContainer: {
      width: '100%',
      height: 6,
      backgroundColor: theme.colors.outline + '20',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: theme.spacing.sm,
    },
    progressBar: {
      height: '100%',
      borderRadius: 3,
    },
    progressStatus: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    streakContainer: {
      marginBottom: theme.spacing.lg,
    },
    quickAddContainer: {
      marginTop: theme.spacing.md,
      // Enhanced elevation for iOS 16 style
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: 'transparent',
    },
  });

export default HeroSection;
