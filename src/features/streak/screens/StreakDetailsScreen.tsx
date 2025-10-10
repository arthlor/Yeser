import React, { useCallback, useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ThemedCard } from '@/shared/components/ui';
import { ScreenHeader, ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
import { createAdvancedMilestones } from '@/features/streak/components/AdvancedStreakMilestones';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { analyticsService } from '@/services/analyticsService';
import { useTranslation } from 'react-i18next';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import type { AppTheme } from '@/themes/types';
import type { AdvancedMilestone } from '@/features/streak/components/AdvancedStreakMilestones';

interface StreakDetailsScreenProps {
  navigation: {
    goBack: () => void;
  };
}

/**
 * 🏆 COORDINATED STREAK DETAILS SCREEN
 *
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated direct Animated.timing for slide and progress animations
 * - Replaced with coordinated animation system
 * - Simplified animation approach following "Barely Noticeable, Maximum Performance"
 * - Static progress display for better performance
 */
const StreakDetailsScreen: React.FC<StreakDetailsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  // Create milestones with localized content
  const ADVANCED_MILESTONES = useMemo(() => createAdvancedMilestones(t), [t]);

  const { data: streakData } = useStreakData();
  const currentStreak = streakData?.current_streak || 0;
  const longestStreak = streakData?.longest_streak || 0;

  // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
  const animations = useCoordinatedAnimations();

  // hero card style will be computed after currentMilestone is available

  const getCurrentMilestone = useCallback((): AdvancedMilestone => {
    return (
      ADVANCED_MILESTONES.find(
        (milestone: AdvancedMilestone) =>
          currentStreak >= milestone.minDays && currentStreak <= milestone.maxDays
      ) || ADVANCED_MILESTONES[0]
    );
  }, [currentStreak, ADVANCED_MILESTONES]);

  const getNextMilestone = useCallback((): AdvancedMilestone | null => {
    return (
      ADVANCED_MILESTONES.find(
        (milestone: AdvancedMilestone) => milestone.minDays > currentStreak
      ) || null
    );
  }, [currentStreak, ADVANCED_MILESTONES]);

  const getProgressPercentage = useCallback((): number => {
    const nextMilestone = getNextMilestone();
    if (!nextMilestone) {
      return 100;
    }

    const currentMilestone = getCurrentMilestone();
    const progress =
      ((currentStreak - currentMilestone.minDays) /
        (nextMilestone.minDays - currentMilestone.minDays)) *
      100;
    return Math.max(0, Math.min(100, progress));
  }, [currentStreak, getCurrentMilestone, getNextMilestone]);

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // Analytics tracking
  useEffect(() => {
    analyticsService.logScreenView('streak_details_screen');

    // Track streak insights with enhanced educational content engagement
    analyticsService.logEvent('streak_details_viewed', {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      current_milestone: getCurrentMilestone().title,
      next_milestone: getNextMilestone()?.title || 'max_reached',
      progress_percentage: Math.round(getProgressPercentage()),
      unlocked_milestones_count: ADVANCED_MILESTONES.filter(
        (m: AdvancedMilestone) => currentStreak >= m.minDays
      ).length,
      days_to_next_milestone: (() => {
        const milestone = getNextMilestone();
        return milestone ? milestone.minDays - currentStreak : 0;
      })(),
      // Enhanced educational context tracking
      streak_stage:
        currentStreak === 0
          ? 'new'
          : currentStreak < 7
            ? 'beginner'
            : currentStreak < 30
              ? 'developing'
              : 'established',
      shows_benefits_section: true,
      shows_maintenance_tips: getNextMilestone() !== null,
      educational_content_available: true,
      user_education_level:
        currentStreak >= 30 ? 'advanced' : currentStreak >= 7 ? 'intermediate' : 'basic',
    });
  }, [
    currentStreak,
    longestStreak,
    getCurrentMilestone,
    getNextMilestone,
    getProgressPercentage,
    ADVANCED_MILESTONES,
  ]);

  const handleGoBack = useCallback((): void => {
    hapticFeedback.light();
    navigation.goBack();
  }, [navigation]);

  const currentMilestone = getCurrentMilestone();
  const nextMilestone = getNextMilestone();
  const progressPercentage = getProgressPercentage();
  const unlockedMilestones = ADVANCED_MILESTONES.filter(
    (m: AdvancedMilestone) => currentStreak >= m.minDays
  );

  const heroCardStyle = useMemo(
    () => ({
      borderRadius: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      backgroundColor: currentMilestone.colorPrimary + '08',
    }),
    [theme.colors.outline, currentMilestone.colorPrimary]
  );

  return (
    <ScreenLayout
      scrollable={true}
      showsVerticalScrollIndicator={false}
      density="compact"
      edges={['top']}
      edgeToEdge={true}
    >
      {/* 🎯 ENHANCED Edge-to-Edge Header */}
      <ScreenHeader
        title={t('streak.details.title')}
        showBackButton={true}
        onBackPress={handleGoBack}
        variant="large"
        rightComponent={
          <View style={styles.streakBadge}>
            <Icon name="fire" size={16} color={theme.colors.onPrimary} />
            <Text style={styles.streakBadgeText}>{currentStreak}</Text>
          </View>
        }
        style={styles.headerContainer}
      />

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        {/* 🚀 ENHANCED Hero Section - Edge-to-Edge */}
        <View style={styles.heroSection}>
          <ThemedCard
            variant="elevated"
            density="comfortable"
            elevation="floating"
            style={heroCardStyle}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroDisplay}>
                <Text style={styles.heroEmoji}>{currentMilestone.emoji}</Text>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroNumber}>{currentStreak}</Text>
                  <Text style={styles.heroLabel}>{t('streak.details.dailyStreakLabel')}</Text>
                  <Text style={[styles.heroMilestone, { color: currentMilestone.colorPrimary }]}>
                    {currentMilestone.title}
                  </Text>
                </View>
              </View>

              {/* 📚 SUBTLE INFO: Streak explanation */}
              <View style={styles.streakExplanationContainer}>
                <Icon name="information-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.streakExplanationText}>
                  {currentStreak === 0
                    ? t('streak.details.explain.new')
                    : currentStreak < 7
                      ? t('streak.details.explain.beginner')
                      : currentStreak < 30
                        ? t('streak.details.explain.developing')
                        : t('streak.details.explain.established')}
                </Text>
              </View>

              {longestStreak > currentStreak && (
                <View style={styles.recordContainer}>
                  <Icon name="trophy-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.recordText}>
                    {t('streak.details.longestRecord', { days: longestStreak })}
                  </Text>
                </View>
              )}
            </View>
          </ThemedCard>
        </View>

        {/* 🎯 ENHANCED Progress Section - Edge-to-Edge */}
        {nextMilestone && (
          <View style={styles.progressSection}>
            <ThemedCard
              variant="elevated"
              density="comfortable"
              elevation="card"
              style={styles.progressCard}
            >
              <View style={styles.progressHeader}>
                <View style={styles.progressHeaderLeft}>
                  <Text style={styles.nextMilestoneEmoji}>{nextMilestone.emoji}</Text>
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressTitle}>{t('streak.details.nextTarget')}</Text>
                    <Text style={styles.progressMilestone}>{nextMilestone.title}</Text>
                  </View>
                </View>
                <View style={styles.daysToNextContainer}>
                  <Text style={styles.daysToNextNumber}>
                    {nextMilestone.minDays - currentStreak}
                  </Text>
                  <Text style={styles.daysToNextLabel}>{t('streak.details.daysLeft')}</Text>
                </View>
              </View>

              <View style={styles.progressVisualization}>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressPercentage}%`,
                        backgroundColor: currentMilestone.colorPrimary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercent}>
                  {t('streak.details.progressPercent', { percent: Math.round(progressPercentage) })}
                </Text>
              </View>

              {/* 📚 SUBTLE INFO: How to maintain streak */}
              <View style={styles.streakMaintenanceInfo}>
                <Text style={styles.streakMaintenanceText}>{t('streak.details.tip')}</Text>
              </View>
            </ThemedCard>
          </View>
        )}

        {/* 🎯 ENHANCED Stats Grid - Edge-to-Edge */}
        <View style={styles.statsSection}>
          <ThemedCard
            variant="elevated"
            density="comfortable"
            elevation="card"
            style={styles.statsCard}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: theme.colors.primary + '15' },
                  ]}
                >
                  <Icon name="fire" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.statNumber}>{currentStreak}</Text>
                <Text style={styles.statLabel}>{t('streak.details.stats.current')}</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: theme.colors.success + '15' },
                  ]}
                >
                  <Icon name="trophy" size={24} color={theme.colors.success} />
                </View>
                <Text style={styles.statNumber}>{longestStreak}</Text>
                <Text style={styles.statLabel}>{t('streak.details.stats.longest')}</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: theme.colors.secondary + '15' },
                  ]}
                >
                  <Icon name="medal" size={24} color={theme.colors.secondary} />
                </View>
                <Text style={styles.statNumber}>{unlockedMilestones.length}</Text>
                <Text style={styles.statLabel}>{t('streak.details.stats.achievements')}</Text>
              </View>
            </View>
          </ThemedCard>
        </View>

        {/* 🎯 ENHANCED Milestones Grid - Edge-to-Edge */}
        <View style={styles.milestonesSection}>
          <ThemedCard
            variant="elevated"
            density="comfortable"
            elevation="card"
            style={styles.milestonesCard}
          >
            <View style={styles.milestonesHeader}>
              <Icon name="star-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('streak.details.allAchievements')}</Text>
              <Text style={styles.unlockedCount}>
                {unlockedMilestones.length}/{ADVANCED_MILESTONES.length}
              </Text>
            </View>

            <View style={styles.milestonesGrid}>
              {ADVANCED_MILESTONES.slice(0, 12).map(
                (milestone: AdvancedMilestone, _index: number) => {
                  const isUnlocked = currentStreak >= milestone.minDays;
                  return (
                    <View
                      key={milestone.id}
                      style={[
                        styles.milestoneItem,
                        isUnlocked ? styles.milestoneItemUnlocked : styles.milestoneItemLocked,
                        {
                          backgroundColor: isUnlocked
                            ? milestone.colorPrimary + '12'
                            : theme.colors.surfaceVariant + '40',
                          borderColor: isUnlocked
                            ? milestone.colorPrimary + '30'
                            : theme.colors.outline + '20',
                        },
                      ]}
                    >
                      <View style={styles.milestoneContent}>
                        <Text
                          style={[
                            styles.milestoneEmoji,
                            isUnlocked
                              ? styles.milestoneEmojiUnlocked
                              : styles.milestoneEmojiLocked,
                          ]}
                        >
                          {milestone.emoji}
                        </Text>
                        <Text
                          style={[
                            styles.milestoneTitle,
                            {
                              color: isUnlocked
                                ? theme.colors.onSurface
                                : theme.colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          {milestone.title}
                        </Text>
                        <Text
                          style={[
                            styles.milestoneDays,
                            {
                              color: isUnlocked
                                ? milestone.colorPrimary
                                : theme.colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          {milestone.minDays}+ gün
                        </Text>
                      </View>

                      {isUnlocked && (
                        <View style={styles.unlockedIndicator}>
                          <Icon name="check-circle" size={12} color={milestone.colorPrimary} />
                        </View>
                      )}
                    </View>
                  );
                }
              )}
            </View>
          </ThemedCard>
        </View>

        {/* 📚 SUBTLE INFO: Benefits information */}
        <View style={styles.benefitsSection}>
          <ThemedCard
            variant="elevated"
            density="comfortable"
            elevation="card"
            style={styles.benefitsCard}
          >
            <View style={styles.benefitsHeader}>
              <Icon name="heart-pulse" size={20} color={theme.colors.success} />
              <Text style={styles.benefitsSectionTitle}>{t('streak.details.benefits.title')}</Text>
            </View>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitEmoji}>🧠</Text>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>
                    {t('streak.details.benefits.mental.title')}
                  </Text>
                  <Text style={styles.benefitDescription}>
                    {t('streak.details.benefits.mental.desc')}
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <Text style={styles.benefitEmoji}>😊</Text>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>
                    {t('streak.details.benefits.happiness.title')}
                  </Text>
                  <Text style={styles.benefitDescription}>
                    {t('streak.details.benefits.happiness.desc')}
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <Text style={styles.benefitEmoji}>🤝</Text>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>
                    {t('streak.details.benefits.relationships.title')}
                  </Text>
                  <Text style={styles.benefitDescription}>
                    {t('streak.details.benefits.relationships.desc')}
                  </Text>
                </View>
              </View>

              {currentStreak >= 7 && (
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitEmoji}>⚡</Text>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>
                      {t('streak.details.benefits.energy.title')}
                    </Text>
                    <Text style={styles.benefitDescription}>
                      {t('streak.details.benefits.energy.desc')}
                    </Text>
                  </View>
                </View>
              )}

              {/* 📚 SUBTLE INFO: Research-based tip for advanced users */}
              {currentStreak >= 21 && (
                <View style={styles.researchTipContainer}>
                  <Icon name="school-outline" size={14} color={theme.colors.secondary} />
                  <Text style={styles.researchTipText}>
                    {t('streak.details.benefits.researchTip')}
                  </Text>
                </View>
              )}
            </View>
          </ThemedCard>
        </View>

        {/* Bottom Spacing for Edge-to-Edge */}
        <View style={styles.bottomSpacing} />
      </Animated.View>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Header Styles
    headerContainer: {
      marginBottom: theme.spacing.sm,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      gap: theme.spacing.xs,
      ...getPrimaryShadow.small(theme),
    },
    streakBadgeText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimary,
      fontWeight: '700',
      letterSpacing: 0.2,
    },

    // Content Container
    contentContainer: {
      flex: 1,
    },

    // Hero Section - Edge-to-Edge
    heroSection: {
      marginBottom: theme.spacing.md,
    },
    heroCard: {
      borderRadius: 0, // Edge-to-edge
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
    },
    heroContent: {
      // Padding handled by density="comfortable"
    },
    heroDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    heroEmoji: {
      fontSize: 56,
      marginRight: theme.spacing.lg,
    },
    heroInfo: {
      flex: 1,
    },
    heroNumber: {
      ...theme.typography.displaySmall,
      fontWeight: '900',
      color: theme.colors.primary,
      lineHeight: 48,
      letterSpacing: -1,
    },
    heroLabel: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      marginBottom: theme.spacing.xs,
    },
    heroMilestone: {
      ...theme.typography.titleMedium,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    streakExplanationContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant + '40',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    streakExplanationText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '500',
      flex: 1,
      lineHeight: 20,
    },
    recordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface + '80',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      alignSelf: 'flex-start',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
    },
    recordText: {
      ...theme.typography.bodyMedium,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginLeft: theme.spacing.sm,
    },

    // Progress Section - Edge-to-Edge
    progressSection: {
      marginBottom: theme.spacing.md,
    },
    progressCard: {
      borderRadius: 0, // Edge-to-edge
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    progressHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    nextMilestoneEmoji: {
      fontSize: 32,
      marginRight: theme.spacing.md,
    },
    progressInfo: {
      flex: 1,
    },
    progressTitle: {
      ...theme.typography.labelMedium,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressMilestone: {
      ...theme.typography.titleLarge,
      fontWeight: '700',
      color: theme.colors.onSurface,
      letterSpacing: -0.3,
    },
    daysToNextContainer: {
      alignItems: 'center',
    },
    daysToNextNumber: {
      ...theme.typography.headlineMedium,
      fontWeight: '800',
      color: theme.colors.primary,
      lineHeight: 32,
    },
    daysToNextLabel: {
      ...theme.typography.labelSmall,
      fontWeight: '600',
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    progressVisualization: {
      marginTop: theme.spacing.sm,
    },
    progressBarContainer: {
      height: 12,
      backgroundColor: theme.colors.outline + '20',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      marginBottom: theme.spacing.sm,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
      ...getPrimaryShadow.small(theme),
    },
    progressPercent: {
      ...theme.typography.labelLarge,
      fontWeight: '700',
      color: theme.colors.primary,
      textAlign: 'center',
      letterSpacing: 0.2,
    },

    // Streak maintenance info styles
    streakMaintenanceInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.primaryContainer + '12',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    streakMaintenanceText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurface,
      fontWeight: '500',
      flex: 1,
      lineHeight: 18,
    },

    // Stats Section - Edge-to-Edge
    statsSection: {
      marginBottom: theme.spacing.md,
    },
    statsCard: {
      borderRadius: 0, // Edge-to-edge
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
    },
    statsGrid: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      ...getPrimaryShadow.small(theme),
    },
    statNumber: {
      ...theme.typography.headlineSmall,
      fontWeight: '800',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.5,
    },
    statLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 16,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.outline + '20',
      marginHorizontal: theme.spacing.sm,
    },

    // Milestones Section - Edge-to-Edge
    milestonesSection: {
      marginBottom: theme.spacing.lg,
    },
    milestonesCard: {
      borderRadius: 0, // Edge-to-edge
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
    },
    milestonesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
    },
    sectionTitle: {
      ...theme.typography.titleMedium,
      fontWeight: '700',
      color: theme.colors.onSurface,
      flex: 1,
      marginLeft: theme.spacing.sm,
      letterSpacing: -0.2,
    },
    unlockedCount: {
      ...theme.typography.labelMedium,
      fontWeight: '700',
      color: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
    },
    milestonesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    milestoneItem: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      position: 'relative',
      ...getPrimaryShadow.small(theme),
    },
    milestoneContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.sm,
    },
    milestoneEmoji: {
      fontSize: 24,
      marginBottom: theme.spacing.sm,
    },
    milestoneTitle: {
      ...theme.typography.labelSmall,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      lineHeight: 14,
    },
    milestoneDays: {
      ...theme.typography.labelSmall,
      fontWeight: '600',
      textAlign: 'center',
      fontSize: 10,
      letterSpacing: 0.2,
    },
    unlockedIndicator: {
      position: 'absolute',
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 2,
    },
    milestoneItemUnlocked: {
      opacity: 1,
    },
    milestoneItemLocked: {
      opacity: 0.6,
    },
    milestoneEmojiUnlocked: {
      opacity: 1,
    },
    milestoneEmojiLocked: {
      opacity: 0.5,
    },

    // Bottom Spacing
    bottomSpacing: {
      height: theme.spacing.xl,
    },

    // Benefits Section
    benefitsSection: {
      marginBottom: theme.spacing.lg,
    },
    benefitsCard: {
      borderRadius: 0, // Edge-to-edge
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
    },
    benefitsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
    },
    benefitsSectionTitle: {
      ...theme.typography.titleMedium,
      fontWeight: '700',
      color: theme.colors.onSurface,
      flex: 1,
      marginLeft: theme.spacing.sm,
      letterSpacing: -0.2,
    },
    benefitsList: {
      padding: theme.spacing.sm,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    benefitEmoji: {
      fontSize: 24,
      marginRight: theme.spacing.sm,
    },
    benefitContent: {
      flex: 1,
    },
    benefitTitle: {
      ...theme.typography.labelMedium,
      fontWeight: '700',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
    },
    benefitDescription: {
      ...theme.typography.bodyMedium,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
    },

    // Research Tip Styles
    researchTipContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer + '12',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    researchTipText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurface,
      fontWeight: '500',
      flex: 1,
      lineHeight: 18,
    },
  });

export default StreakDetailsScreen;
