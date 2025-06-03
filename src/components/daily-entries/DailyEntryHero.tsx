import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface DailyEntryHeroProps {
  isToday: boolean;
  statementCount: number;
  dailyGoal?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const DailyEntryHero: React.FC<DailyEntryHeroProps> = ({
  isToday,
  statementCount,
  dailyGoal = 3,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: Math.min((statementCount / dailyGoal) * 100, 100),
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();

    // Celebration animation for goal achievement
    if (statementCount >= dailyGoal && statementCount > 0) {
      Animated.sequence([
        Animated.spring(celebrationScale, {
          toValue: 1.05,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(celebrationScale, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [statementCount, dailyGoal]);

  const getGreeting = () => {
    if (!isToday) return '';

    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın! ☀️';
    if (hour < 18) return 'İyi günler! 🌤️';
    return 'İyi akşamlar! 🌙';
  };

  const getMainMessage = () => {
    const progress = statementCount / dailyGoal;

    if (statementCount === 0) {
      return isToday ? 'Bugün hangi şeyler için minnettarsın?' : 'O gün hangi anlar için şükredin?';
    }

    if (progress >= 1) {
      return '🎉 Harika! Günlük hedefini tamamladın!';
    }

    if (progress >= 0.66) {
      return '✨ Çok güzel! Hedefe yaklaştın!';
    }

    if (progress >= 0.33) {
      return '💚 İyi gidiyor! Devam et!';
    }

    return '🌱 Güzel bir başlangıç!';
  };

  const progressPercentage = Math.min((statementCount / dailyGoal) * 100, 100);
  const isCompleted = statementCount >= dailyGoal;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { scale: celebrationScale }],
        },
      ]}
    >
      {/* Greeting for today */}
      {isToday && <Text style={styles.greeting}>{getGreeting()}</Text>}

      {/* Main message */}
      <Text style={styles.mainMessage}>{getMainMessage()}</Text>

      {/* Progress section */}
      <View style={styles.progressSection}>
        {/* Count and goal */}
        <View style={styles.statsContainer}>
          <View style={styles.countContainer}>
            <Text style={[styles.countNumber, isCompleted && styles.countNumberCompleted]}>
              {statementCount}
            </Text>
            <Text style={styles.countLabel}>/ {dailyGoal}</Text>
          </View>

          <Text style={styles.progressLabel}>{statementCount === 1 ? 'şükran' : 'şükran'}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                  backgroundColor: isCompleted ? theme.colors.success : theme.colors.primary,
                },
              ]}
            />

            {/* Progress glow effect when completed */}
            {isCompleted && (
              <Animated.View
                style={[
                  styles.progressGlow,
                  {
                    opacity: progressAnim.interpolate({
                      inputRange: [90, 100],
                      outputRange: [0, 0.6],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            )}
          </View>

          {/* Completion icon */}
          {isCompleted && (
            <View style={styles.completionIcon}>
              <Icon name="check-circle" size={16} color={theme.colors.success} />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    greeting: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
      letterSpacing: 0.25,
    },
    mainMessage: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.md,
      lineHeight: 24,
      letterSpacing: -0.3,
    },
    progressSection: {
      gap: theme.spacing.sm,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    countContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    countNumber: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.colors.primary,
      letterSpacing: -1,
    },
    countNumberCompleted: {
      color: theme.colors.success,
    },
    countLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.xs,
      letterSpacing: -0.2,
    },
    progressLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.1,
    },
    progressBarContainer: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressTrack: {
      flex: 1,
      height: 6,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 3,
      overflow: 'hidden',
      position: 'relative',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    progressGlow: {
      position: 'absolute',
      top: -2,
      left: 0,
      right: 0,
      bottom: -2,
      backgroundColor: theme.colors.success,
      borderRadius: 5,
      opacity: 0.3,
    },
    completionIcon: {
      marginLeft: theme.spacing.sm,
      padding: 2,
    },
  });

export default DailyEntryHero;
