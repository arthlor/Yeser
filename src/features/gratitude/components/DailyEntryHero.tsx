import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DailyEntryHeroProps {
  isToday: boolean;
  statementCount: number;
  dailyGoal?: number;
}

/**
 * 🌟 COORDINATED DAILY ENTRY HERO
 * 
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated direct Animated.timing for progress animations
 * - Replaced with coordinated animation system
 * - Simplified animation approach following "Barely Noticeable, Maximum Performance"
 * - Static progress display for better performance
 */
const DailyEntryHero: React.FC<DailyEntryHeroProps> = ({
  isToday,
  statementCount,
  dailyGoal = 3,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
  const animations = useCoordinatedAnimations();

  // Calculate progress percentage for display
  const progressPercentage = Math.min((statementCount / dailyGoal) * 100, 100);

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // **MINIMAL PROGRESS FEEDBACK**: Simple opacity change when progress updates
  useEffect(() => {
    if (statementCount > 0) {
      animations.animateFade(1, { duration: 200 });
    }
  }, [statementCount, animations]);

  const getGreeting = () => {
    if (!isToday) {
      return '';
    }

    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Günaydın! ☀️';
    }
    if (hour < 18) {
      return 'İyi günler! 🌤️';
    }
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

  const isCompleted = statementCount >= dailyGoal;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: animations.fadeAnim,
          transform: animations.entranceTransform,
        }
      ]}
    >
      <ThemedCard variant="elevated" density="comfortable" style={styles.heroCard}>
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

            <Text style={styles.progressLabel}>{Math.round(progressPercentage)}% tamamlandı</Text>
          </View>

          {/* Progress bar - simplified static display */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: isCompleted ? theme.colors.success : theme.colors.primary,
                  },
                ]}
              />

              {/* Progress glow effect when completed - simplified */}
              {isCompleted && (
                <View style={styles.progressGlow} />
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
      </ThemedCard>
    </Animated.View>
  );
};

DailyEntryHero.displayName = 'DailyEntryHero';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sm,
    },
    heroCard: {
      // ThemedCard handles internal padding via density
    },
    greeting: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      fontWeight: '600',
    },
    mainMessage: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      fontWeight: '600',
      lineHeight: 26,
    },
    progressSection: {
      alignItems: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    countContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginRight: theme.spacing.sm,
    },
    countNumber: {
      ...theme.typography.headlineLarge,
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 36,
    },
    countNumberCompleted: {
      color: theme.colors.success,
    },
    countLabel: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      marginLeft: theme.spacing.xs,
    },
    progressLabel: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    progressBarContainer: {
      width: '100%',
      alignItems: 'center',
      position: 'relative',
    },
    progressTrack: {
      width: '100%',
      height: 8,
      backgroundColor: theme.colors.outline + '20',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      position: 'relative',
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
      minWidth: 8,
    },
    progressGlow: {
      position: 'absolute',
      top: -2,
      left: 0,
      right: 0,
      bottom: -2,
      backgroundColor: theme.colors.success + '30',
      borderRadius: theme.borderRadius.full,
      opacity: 0.6,
    },
    completionIcon: {
      position: 'absolute',
      right: -8,
      top: -4,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.full,
      padding: theme.spacing.xxs,
    },
  });

export default DailyEntryHero;
