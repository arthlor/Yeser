import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, Vibration, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useTranslation } from 'react-i18next';

interface AdvancedStreakMilestonesProps {
  currentStreak: number;
  longestStreak: number;
  onMilestoneAchieved?: (milestone: AdvancedMilestone) => void;
  showCelebration?: boolean;
  onPress?: () => void;
}

export interface AdvancedMilestone {
  id: string;
  minDays: number;
  maxDays: number;
  title: string;
  description: string;
  emoji: string;
  reward: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legendary';
  colorPrimary: string;
  colorSecondary: string;
  particleEffect: 'sparks' | 'stars' | 'hearts' | 'fire' | 'rainbow' | 'galaxy';
  soundEffect?: string;
  unlockedMessage: string;
}

// Removed unused screenWidth variable

// Create milestones with i18n support
const createAdvancedMilestones = (t: (key: string) => string): AdvancedMilestone[] => [
  {
    id: 'first-step',
    minDays: 1,
    maxDays: 1,
    title: t('streak.milestones.firstStep.title'),
    description: t('streak.milestones.firstStep.description'),
    emoji: '🌱',
    reward: t('streak.milestones.firstStep.reward'),
    category: 'beginner',
    colorPrimary: '#4CAF50',
    colorSecondary: '#81C784',
    particleEffect: 'sparks',
    unlockedMessage: t('streak.milestones.firstStep.unlockedMessage'),
  },
  {
    id: 'momentum',
    minDays: 3,
    maxDays: 6,
    title: t('streak.milestones.momentum.title'),
    description: t('streak.milestones.momentum.description'),
    emoji: '🌿',
    reward: t('streak.milestones.momentum.reward'),
    category: 'beginner',
    colorPrimary: '#66BB6A',
    colorSecondary: '#A5D6A7',
    particleEffect: 'hearts',
    unlockedMessage: t('streak.milestones.momentum.unlockedMessage'),
  },
  {
    id: 'first-week',
    minDays: 7,
    maxDays: 13,
    title: t('streak.milestones.firstWeek.title'),
    description: t('streak.milestones.firstWeek.description'),
    emoji: '🌳',
    reward: t('streak.milestones.firstWeek.reward'),
    category: 'intermediate',
    colorPrimary: '#2E7D32',
    colorSecondary: '#4CAF50',
    particleEffect: 'stars',
    unlockedMessage: t('streak.milestones.firstWeek.unlockedMessage'),
  },
  {
    id: 'two-weeks',
    minDays: 14,
    maxDays: 20,
    title: t('streak.milestones.twoWeeks.title'),
    description: t('streak.milestones.twoWeeks.description'),
    emoji: '🌸',
    reward: t('streak.milestones.twoWeeks.reward'),
    category: 'intermediate',
    colorPrimary: '#E91E63',
    colorSecondary: '#F48FB1',
    particleEffect: 'hearts',
    unlockedMessage: t('streak.milestones.twoWeeks.unlockedMessage'),
  },
  {
    id: 'three-weeks',
    minDays: 21,
    maxDays: 29,
    title: t('streak.milestones.threeWeeks.title'),
    description: t('streak.milestones.threeWeeks.description'),
    emoji: '🌺',
    reward: t('streak.milestones.threeWeeks.reward'),
    category: 'intermediate',
    colorPrimary: '#9C27B0',
    colorSecondary: '#CE93D8',
    particleEffect: 'fire',
    unlockedMessage: t('streak.milestones.threeWeeks.unlockedMessage'),
  },
  {
    id: 'one-month',
    minDays: 30,
    maxDays: 44,
    title: t('streak.milestones.oneMonth.title'),
    description: t('streak.milestones.oneMonth.description'),
    emoji: '🌻',
    reward: t('streak.milestones.oneMonth.reward'),
    category: 'advanced',
    colorPrimary: '#FF9800',
    colorSecondary: '#FFB74D',
    particleEffect: 'rainbow',
    unlockedMessage: t('streak.milestones.oneMonth.unlockedMessage'),
  },
  {
    id: 'six-weeks',
    minDays: 45,
    maxDays: 59,
    title: t('streak.milestones.sixWeeks.title'),
    description: t('streak.milestones.sixWeeks.description'),
    emoji: '⚡',
    reward: t('streak.milestones.sixWeeks.reward'),
    category: 'advanced',
    colorPrimary: '#FFC107',
    colorSecondary: '#FFF176',
    particleEffect: 'fire',
    unlockedMessage: t('streak.milestones.sixWeeks.unlockedMessage'),
  },
  {
    id: 'two-months',
    minDays: 60,
    maxDays: 89,
    title: t('streak.milestones.twoMonths.title'),
    description: t('streak.milestones.twoMonths.description'),
    emoji: '💎',
    reward: t('streak.milestones.twoMonths.reward'),
    category: 'advanced',
    colorPrimary: '#3F51B5',
    colorSecondary: '#7986CB',
    particleEffect: 'stars',
    unlockedMessage: t('streak.milestones.twoMonths.unlockedMessage'),
  },
  {
    id: 'three-months',
    minDays: 90,
    maxDays: 119,
    title: t('streak.milestones.threeMonths.title'),
    description: t('streak.milestones.threeMonths.description'),
    emoji: '🔥',
    reward: t('streak.milestones.threeMonths.reward'),
    category: 'expert',
    colorPrimary: '#F44336',
    colorSecondary: '#EF5350',
    particleEffect: 'fire',
    unlockedMessage: t('streak.milestones.threeMonths.unlockedMessage'),
  },
  {
    id: 'four-months',
    minDays: 120,
    maxDays: 149,
    title: t('streak.milestones.fourMonths.title'),
    description: t('streak.milestones.fourMonths.description'),
    emoji: '🌟',
    reward: t('streak.milestones.fourMonths.reward'),
    category: 'expert',
    colorPrimary: '#795548',
    colorSecondary: '#A1887F',
    particleEffect: 'galaxy',
    unlockedMessage: t('streak.milestones.fourMonths.unlockedMessage'),
  },
  {
    id: 'five-months',
    minDays: 150,
    maxDays: 179,
    title: t('streak.milestones.fiveMonths.title'),
    description: t('streak.milestones.fiveMonths.description'),
    emoji: '🌙',
    reward: t('streak.milestones.fiveMonths.reward'),
    category: 'expert',
    colorPrimary: '#607D8B',
    colorSecondary: '#90A4AE',
    particleEffect: 'stars',
    unlockedMessage: t('streak.milestones.fiveMonths.unlockedMessage'),
  },
  {
    id: 'six-months',
    minDays: 180,
    maxDays: 269,
    title: t('streak.milestones.sixMonths.title'),
    description: t('streak.milestones.sixMonths.description'),
    emoji: '🌈',
    reward: t('streak.milestones.sixMonths.reward'),
    category: 'expert',
    colorPrimary: '#E91E63',
    colorSecondary: '#F48FB1',
    particleEffect: 'rainbow',
    unlockedMessage: t('streak.milestones.sixMonths.unlockedMessage'),
  },
  {
    id: 'nine-months',
    minDays: 270,
    maxDays: 364,
    title: t('streak.milestones.nineMonths.title'),
    description: t('streak.milestones.nineMonths.description'),
    emoji: '👑',
    reward: t('streak.milestones.nineMonths.reward'),
    category: 'legendary',
    colorPrimary: '#FF6F00',
    colorSecondary: '#FFB74D',
    particleEffect: 'galaxy',
    unlockedMessage: t('streak.milestones.nineMonths.unlockedMessage'),
  },
  {
    id: 'one-year',
    minDays: 365,
    maxDays: 499,
    title: t('streak.milestones.oneYear.title'),
    description: t('streak.milestones.oneYear.description'),
    emoji: '🏆',
    reward: t('streak.milestones.oneYear.reward'),
    category: 'legendary',
    colorPrimary: '#FFD700',
    colorSecondary: '#FFF176',
    particleEffect: 'galaxy',
    unlockedMessage: t('streak.milestones.oneYear.unlockedMessage'),
  },
  {
    id: 'infinite',
    minDays: 500,
    maxDays: Infinity,
    title: t('streak.milestones.infinite.title'),
    description: t('streak.milestones.infinite.description'),
    emoji: '✨',
    reward: t('streak.milestones.infinite.reward'),
    category: 'legendary',
    colorPrimary: '#9C27B0',
    colorSecondary: '#E1BEE7',
    particleEffect: 'galaxy',
    unlockedMessage: t('streak.milestones.infinite.unlockedMessage'),
  },
];

/**
 * 🏆 COORDINATED STREAK MILESTONES
 *
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated direct Animated.timing for progress animations
 * - Replaced with coordinated animation system
 * - Simplified animation approach following "Barely Noticeable, Maximum Performance"
 * - Enhanced consistency with coordinated animation philosophy
 */
const AdvancedStreakMilestones: React.FC<AdvancedStreakMilestonesProps> = ({
  currentStreak,
  longestStreak,
  onPress,
  showCelebration = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  // Create milestones with localized content
  const ADVANCED_MILESTONES = useMemo(() => createAdvancedMilestones(t), [t]);

  // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
  const animations = useCoordinatedAnimations();

  const [currentMilestone, setCurrentMilestone] = useState<AdvancedMilestone | null>(null);
  const [nextMilestone, setNextMilestone] = useState<AdvancedMilestone | null>(null);
  const [isPersonalRecord, setIsPersonalRecord] = useState(false);

  // Memoized achievement badge styles
  const getAchievementBadgeStyle = useMemo(() => {
    return ADVANCED_MILESTONES.slice(0, 6).reduce((styles: Record<string, object>, milestone) => {
      const isUnlocked = currentStreak >= milestone.minDays;
      styles[milestone.id] = {
        opacity: isUnlocked ? 1 : 0.3,
        backgroundColor: isUnlocked
          ? milestone.colorPrimary + '15'
          : theme.colors.surfaceVariant + '50',
      };
      return styles;
    }, {});
  }, [currentStreak, theme.colors.surfaceVariant, ADVANCED_MILESTONES]);

  // Find current and next milestones
  useEffect(() => {
    const current =
      ADVANCED_MILESTONES.find((m) => currentStreak >= m.minDays && currentStreak <= m.maxDays) ||
      ADVANCED_MILESTONES[0];

    const next = ADVANCED_MILESTONES.find((m) => m.minDays > currentStreak);

    setCurrentMilestone(current);
    setNextMilestone(next || null);
    setIsPersonalRecord(currentStreak > longestStreak && currentStreak > 0);
  }, [currentStreak, longestStreak, ADVANCED_MILESTONES]);

  // Calculate progress to next milestone
  const getProgressPercentage = useCallback((): number => {
    if (!currentMilestone || !nextMilestone) {
      return 100;
    }

    const currentRange = currentMilestone.maxDays - currentMilestone.minDays + 1;
    const progress = currentStreak - currentMilestone.minDays + 1;
    return Math.min(100, (progress / currentRange) * 100);
  }, [currentMilestone, nextMilestone, currentStreak]);

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((milestone: AdvancedMilestone) => {
    if (milestone.category === 'legendary') {
      // Strong haptic for legendary achievements
      Vibration.vibrate([0, 200, 100, 200, 100, 300]);
    } else if (milestone.category === 'expert') {
      // Medium haptic for expert achievements
      Vibration.vibrate([0, 150, 50, 150]);
    } else if (milestone.category === 'advanced') {
      // Medium haptic for advanced achievements
      Vibration.vibrate([0, 100, 50, 100]);
    } else {
      // Light haptic for beginner/intermediate achievements
      Vibration.vibrate(100);
    }
  }, []);

  // Simplified celebration - haptic feedback only
  useEffect(() => {
    if (showCelebration && currentMilestone) {
      triggerHapticFeedback(currentMilestone);
    }
  }, [showCelebration, currentMilestone, triggerHapticFeedback]);

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // **MINIMAL PROGRESS FEEDBACK**: Simple opacity change when progress updates
  useEffect(() => {
    if (currentStreak > 0) {
      animations.animateFade(1, { duration: 200 });
    }
  }, [currentStreak, animations]);

  // **REMOVED TRANSFORM**: Prevents iOS blurriness
  // const optimizedTransform = animations.entranceTransform;

  if (!currentMilestone) {
    return null;
  }

  let daysToNext = nextMilestone ? nextMilestone.minDays - currentStreak : 0;
  if (daysToNext < 0) {
    daysToNext = 0;
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        {
          opacity: animations.fadeAnim,
          // **REMOVED TRANSFORM**: Prevents iOS blurriness on streak section
          // transform: optimizedTransform,
          // **iOS ANTI-BLUR OPTIMIZATIONS**: Ensure pixel-perfect rendering
          ...(Platform.OS === 'ios' && {
            shouldRasterizeIOS: true,
            rasterizationScale: 2, // Use 2x for Retina displays
          }),
          // **ANDROID OPTIMIZATION**
          ...(Platform.OS === 'android' && {
            renderToHardwareTextureAndroid: true,
          }),
        },
      ]}
    >
      <ThemedCard
        variant="elevated"
        density="standard"
        elevation="card"
        onPress={handlePress}
        style={styles.container}
        touchableProps={{
          activeOpacity: 0.8,
        }}
      >
        {/* Simplified celebration overlay */}
        {showCelebration && (
          <View style={styles.celebrationOverlay}>
            <Text style={styles.celebrationText}>{currentMilestone.unlockedMessage}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Current milestone display */}
          <View style={styles.milestoneHeader}>
            <View style={styles.milestoneIconContainer}>
              <Text style={styles.milestoneEmoji}>{currentMilestone.emoji}</Text>
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={[styles.milestoneTitle, { color: currentMilestone.colorPrimary }]}>
                {t(`streak.milestones.titles.${currentMilestone.id}`, {
                  defaultValue: currentMilestone.title,
                })}
              </Text>
              <Text style={styles.milestoneDescription}>
                {t(`streak.milestones.descriptions.${currentMilestone.id}`, {
                  defaultValue: currentMilestone.description,
                })}
              </Text>
            </View>
            {/* Subtle clickable indicator */}
            {onPress && (
              <View style={styles.clickableIndicator}>
                <Icon name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
              </View>
            )}
          </View>

          {/* Compact streak counter */}
          <View style={styles.streakCounter}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>{t('streak.details.dailyStreakLabel')}</Text>

            {isPersonalRecord && (
              <View style={styles.recordBadge}>
                <Icon name="trophy" size={10} color={theme.colors.warning} />
                <Text style={styles.recordText}>{t('streak.milestones.newRecord')}</Text>
              </View>
            )}
          </View>

          {/* Progress to next milestone */}
          {nextMilestone && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>
                {t('streak.milestones.next', {
                  title: t(`streak.milestones.titles.${nextMilestone.id}`, {
                    defaultValue: nextMilestone.title,
                  }),
                  days: daysToNext,
                })}
              </Text>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${getProgressPercentage()}%`,
                      backgroundColor: currentMilestone.colorPrimary,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Compact achievement showcase */}
          <View style={styles.achievementGrid}>
            {ADVANCED_MILESTONES.slice(0, 6).map((milestone) => (
              <View
                key={milestone.id}
                style={[styles.achievementBadge, getAchievementBadgeStyle[milestone.id]]}
              >
                <Text style={styles.achievementEmoji}>{milestone.emoji}</Text>
              </View>
            ))}
          </View>

          {/* Subtle hint at bottom */}
          {onPress && (
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>{t('streak.milestones.tapHint')}</Text>
            </View>
          )}
        </View>
      </ThemedCard>
    </Animated.View>
  );
};

AdvancedStreakMilestones.displayName = 'AdvancedStreakMilestones';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      overflow: 'hidden',
      // **iOS ANTI-BLUR OPTIMIZATIONS**
      ...(Platform.OS === 'ios' && {
        shouldRasterizeIOS: true,
        rasterizationScale: 2, // Use 2x for Retina displays
      }),
      // **ANDROID OPTIMIZATION**
      ...(Platform.OS === 'android' && {
        renderToHardwareTextureAndroid: true,
      }),
    },
    glowEffect: {
      position: 'absolute',
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderRadius: theme.borderRadius.lg + 8,
    },
    celebrationOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface + 'CC',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      borderRadius: theme.borderRadius.lg,
    },
    celebrationText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
      textAlign: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    particleContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 5,
    },
    particle: {
      position: 'absolute',
      top: '50%',
      left: '50%',
    },
    particleEmoji: {
      fontSize: 20,
    },
    content: {
      // Remove padding since ThemedCard handles it
    },
    milestoneHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    milestoneIconContainer: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    milestoneEmoji: {
      fontSize: 32,
    },
    milestoneInfo: {
      flex: 1,
    },
    milestoneTitle: {
      ...theme.typography.titleSmall,
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.2,
      // **iOS TEXT OPTIMIZATION**: Prevent text blurring on iOS
      ...(Platform.OS === 'ios' && {
        includeFontPadding: false,
      }),
    },
    milestoneDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
    },
    streakCounter: {
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    streakNumber: {
      ...theme.typography.headlineMedium,
      fontWeight: '900',
      color: theme.colors.primary,
      lineHeight: 36,
      // **iOS TEXT OPTIMIZATION**: Prevent text blurring on iOS
      ...(Platform.OS === 'ios' && {
        textAlign: 'center',
        includeFontPadding: false,
      }),
    },
    streakLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    recordBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warningContainer + '60',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.full,
      marginTop: theme.spacing.xs,
    },
    recordText: {
      ...theme.typography.labelSmall,
      fontWeight: '700',
      color: theme.colors.onWarningContainer,
      marginLeft: theme.spacing.xs,
      fontSize: 10,
    },
    progressSection: {
      marginBottom: theme.spacing.sm,
    },
    progressLabel: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
    },
    progressBarContainer: {
      height: 4,
      backgroundColor: theme.colors.outline + '30',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
    achievementGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    achievementBadge: {
      width: '15%',
      aspectRatio: 1,
      borderRadius: theme.borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    achievementEmoji: {
      fontSize: 14,
    },
    clickableIndicator: {
      padding: theme.spacing.xs,
      opacity: 0.6,
    },
    tapHint: {
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
    },
    tapHintText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      opacity: 0.8,
    },
  });

export default AdvancedStreakMilestones;
export { createAdvancedMilestones };
