import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AdvancedStreakMilestones from '@/features/streak/components/AdvancedStreakMilestones';
import { useStreakStatus } from '@/features/streak/hooks';

interface HeroSectionProps {
  greeting: string;
  username?: string | null;
  currentCount: number;
  dailyGoal: number;
  currentStreak: number;
  longestStreak?: number;
  onStreakPress?: () => void;
}

/**
 * 🏠 COORDINATED HERO SECTION
 * 
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated direct Animated.timing for progress animations
 * - Replaced with coordinated animation system
 * - Simplified animation approach following "Barely Noticeable, Maximum Performance"
 * - Enhanced consistency with coordinated animation philosophy
 */
const HeroSection: React.FC<HeroSectionProps> = ({
  greeting,
  username,
  currentCount,
  dailyGoal,
  currentStreak,
  longestStreak,
  onStreakPress,
}) => {
  const { theme } = useTheme();
  const { status, statusMessage, canExtendToday } = useStreakStatus();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
  const animations = useCoordinatedAnimations();

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // **MINIMAL PROGRESS FEEDBACK**: Simple opacity change when progress updates
  useEffect(() => {
    if (currentCount > 0) {
      animations.animateFade(1, { duration: 200 });
    }
  }, [currentCount, animations]);

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
    const isGoalComplete = currentCount >= dailyGoal;

    if (isGoalComplete) {
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
      accent: 'Bugünün ilk minnetini bekliyoruz ✨',
    };
  };

  const getMotivationalSubtext = () => {
    if (currentCount === 0) {
      return {
        main: 'Bugünün ilk minnetini ekleyerek güne başlayın',
        sub: 'Küçük adımlar, büyük değişimler yaratır',
      };
    }

    const isGoalComplete = currentCount >= dailyGoal;
    if (isGoalComplete) {
      return {
        main: 'Günlük hedefinizi tamamladınız! 🎊',
        sub: 'İstersen daha fazla minnet ekleyebilirsiniz',
      };
    }

    const remaining = dailyGoal - currentCount;
    const progressPercentage = Math.round((currentCount / dailyGoal) * 100);

    return {
      main: `Hedefe ${remaining} minnet kaldı (${progressPercentage}% tamamlandı)`,
      sub: '',
    };
  };

  const greeting_data = getContextualGreeting();
  const motivation = getMotivationalSubtext();

  // Get status color based on streak status
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return theme.colors.success;
      case 'grace_period':
        return theme.colors.warning;
      case 'at_risk':
        return theme.colors.error;
      case 'broken':
        return theme.colors.onSurfaceVariant;
      default:
        return theme.colors.primary;
    }
  };

  // Get status icon based on streak status
  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return 'check-circle';
      case 'grace_period':
        return 'clock-alert';
      case 'at_risk':
        return 'alert-circle';
      case 'broken':
        return 'restart';
      default:
        return 'play-circle';
    }
  };

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
      {/* Edge-to-Edge Hero Card */}
      <ThemedCard
        variant="elevated"
        density="comfortable"
        elevation="floating"
        style={styles.heroCard}
      >
        {/* Header Section with Internal Padding */}
        <View style={styles.headerSection}>
          <View style={styles.greetingContainer}>
            <Text style={styles.primaryGreeting}>{greeting_data.primary}</Text>
            <Text style={styles.secondaryGreeting}>{greeting_data.secondary}</Text>
            <Text style={styles.accentText}>{greeting_data.accent}</Text>
          </View>

          {/* Motivational Progress Section */}
          <View style={styles.motivationSection}>
            <Text style={styles.motivationMain}>{motivation.main}</Text>
            <Text style={styles.motivationSub}>{motivation.sub}</Text>
          </View>
        </View>

        {/* Streak Status Section */}
        {status !== 'new' && (
          <View style={styles.streakStatusSection}>
            <View style={styles.statusBorder} />
            <View style={styles.streakStatusContent}>
              <Icon
                name={getStatusIcon()}
                size={16}
                color={getStatusColor()}
                style={styles.statusIcon}
              />
              <Text style={[styles.statusMessage, { color: getStatusColor() }]}>
                {statusMessage}
              </Text>
              {canExtendToday && status === 'grace_period' && (
                <Icon name="chevron-right" size={16} color={getStatusColor()} />
              )}
            </View>
          </View>
        )}

        {/* Streak Showcase Section */}
        <View style={styles.streakSection}>
          <AdvancedStreakMilestones
            currentStreak={currentStreak}
            longestStreak={longestStreak || 0}
            onPress={onStreakPress}
          />
        </View>
      </ThemedCard>
    </Animated.View>
  );
};

HeroSection.displayName = 'HeroSection';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    // Edge-to-edge hero card style
    heroCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      ...getPrimaryShadow.floating(theme),
    },
    // Header section - padding handled by density="comfortable"
    headerSection: {
      // Padding handled by density="comfortable"
    },
    greetingContainer: {
      alignItems: 'center',
    },
    primaryGreeting: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    secondaryGreeting: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      fontWeight: '500',
    },
    accentText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.primary,
      textAlign: 'center',
      fontWeight: '600',
    },
    // Motivational progress section
    motivationSection: {
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    motivationMain: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    motivationSub: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    // Streak status section with separator
    streakStatusSection: {
      paddingVertical: theme.spacing.sm,
      // Horizontal padding handled by card density
    },
    statusBorder: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginBottom: theme.spacing.sm,
    },
    streakStatusContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.xs,
    },
    statusIcon: {
      marginRight: theme.spacing.xs,
    },
    statusMessage: {
      flex: 1,
      ...theme.typography.bodyMedium,
      fontWeight: '500',
    },
    // Streak showcase section
    streakSection: {
      paddingBottom: theme.spacing.md,
      // Horizontal padding handled by card density
    },
  });

export default HeroSection;
