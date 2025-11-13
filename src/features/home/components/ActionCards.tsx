/* eslint-disable react-native/no-color-literals */
import React, { useCallback, useMemo } from 'react';
import { Animated, Platform, StyleSheet, Text, Vibration, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getSurfaceColor } from '@/themes/utils';
import { useTranslation } from 'react-i18next';

import type { ViewStyle } from 'react-native';
import type { AppTheme } from '@/themes/types';

interface ActionCardsProps {
  currentCount: number;
  dailyGoal: number;
  onNavigateToEntry: () => void;
  onNavigateToPastEntries: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToWhyGratitude: () => void;
}

const ActionCards: React.FC<ActionCardsProps> = React.memo(
  ({
    currentCount,
    dailyGoal,
    onNavigateToEntry,
    onNavigateToPastEntries,
    onNavigateToCalendar,
    onNavigateToWhyGratitude,
  }) => {
    const { theme, colorMode } = useTheme();
    const styles = useMemo(() => createStyles(theme, colorMode), [theme, colorMode]);
    const { t } = useTranslation();

    // **RACE CONDITION FIX**: Use coordinated animation system
    const primaryAnimations = useCoordinatedAnimations();
    const pastEntriesAnimations = useCoordinatedAnimations();
    const calendarAnimations = useCoordinatedAnimations();
    const whyGratitudeAnimations = useCoordinatedAnimations();

    // Memoize dynamic styles to prevent object creation on every render
    const dynamicStyles = useMemo(() => {
      const buildAnimatedStyle = (
        animations: ReturnType<typeof useCoordinatedAnimations>
      ): Animated.WithAnimatedObject<ViewStyle> => ({
        transform: animations.combinedTransform,
        opacity: animations.fadeAnim,
      });

      return {
        primaryCardTransform: buildAnimatedStyle(primaryAnimations),
        pastEntriesTransform: buildAnimatedStyle(pastEntriesAnimations),
        calendarTransform: buildAnimatedStyle(calendarAnimations),
        whyGratitudeTransform: buildAnimatedStyle(whyGratitudeAnimations),
      };
    }, [primaryAnimations, pastEntriesAnimations, calendarAnimations, whyGratitudeAnimations]);

    // **RACE CONDITION FIX**: Coordinated press handlers with haptic feedback
    const handlePressIn = useCallback((animations: ReturnType<typeof useCoordinatedAnimations>) => {
      // Enhanced haptic feedback for iOS
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      }

      animations.animatePressIn();
    }, []);

    const handlePressOut = useCallback(
      (animations: ReturnType<typeof useCoordinatedAnimations>) => {
        animations.animatePressOut();
      },
      []
    );

    const getPrimaryActionData = useMemo(() => {
      if (currentCount === 0) {
        return {
          title: t('home.actions.start.title'),
          icon: 'plus-circle',
        } as const;
      }

      if (currentCount >= dailyGoal) {
        return null; // Don't show primary action when goal is completed
      }

      return {
        title: t('home.actions.progress.title'),
        icon: 'heart-plus',
      } as const;
    }, [currentCount, dailyGoal, t]);

    const primaryAction = getPrimaryActionData;

    // Subtle description under the Continue title
    const primarySubtitle = useMemo(() => {
      if (!primaryAction) {
        return '';
      }
      if (currentCount === 0) {
        return t('home.actions.start.subtitle');
      }
      const remaining = Math.max(dailyGoal - currentCount, 0);
      return t('home.actions.progress.subtitle', { remaining });
    }, [primaryAction, currentCount, dailyGoal, t]);

    const progressLabel = useMemo(() => {
      if (!primaryAction || dailyGoal <= 0) {
        return '';
      }

      return t('home.inspiration.progressLabel', {
        current: Math.min(currentCount, dailyGoal),
        dailyGoal,
      });
    }, [currentCount, dailyGoal, primaryAction, t]);

    return (
      <View style={styles.container}>
        {/* Enhanced Primary Action Card - Edge-to-Edge */}
        {primaryAction && (
          <Animated.View style={[styles.primaryCardContainer, dynamicStyles.primaryCardTransform]}>
            <ThemedCard
              variant="outlined"
              density="comfortable"
              elevation="none"
              onPress={onNavigateToEntry}
              style={styles.primaryCardFrame}
              touchableProps={{
                onPressIn: () => handlePressIn(primaryAnimations),
                onPressOut: () => handlePressOut(primaryAnimations),
                activeOpacity: 1,
              }}
            >
              <View style={styles.primaryCardContent}>
                <View style={styles.primaryHeader}>
                  <View style={styles.primaryHeaderLeft}>
                    <View style={styles.primaryIconContainer}>
                      <Icon name={primaryAction.icon} size={22} color={theme.colors.primary} />
                    </View>
                    <View style={styles.primaryTextContainer}>
                      <Text style={styles.primaryActionTitle}>{primaryAction.title}</Text>
                      {!!primarySubtitle && (
                        <Text style={styles.primaryActionSubtitle}>{primarySubtitle}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.primaryHeaderRight}>
                    {!!progressLabel && (
                      <View style={styles.progressBadge}>
                        <Text style={styles.progressBadgeText}>{progressLabel}</Text>
                      </View>
                    )}
                    <Icon name="chevron-right" size={22} color={theme.colors.primary} />
                  </View>
                </View>
              </View>
            </ThemedCard>
          </Animated.View>
        )}

        {/* Enhanced Secondary Action Cards - Edge-to-Edge Grid */}
        <View style={styles.secondaryList}>
          {/* Enhanced Past Entries Card */}
          <Animated.View style={[styles.secondaryItemWrapper, dynamicStyles.pastEntriesTransform]}>
            <ThemedCard
              density="comfortable"
              elevation="none"
              variant="outlined"
              onPress={onNavigateToPastEntries}
              style={styles.secondaryCard}
              touchableProps={{
                onPressIn: () => handlePressIn(pastEntriesAnimations),
                onPressOut: () => handlePressOut(pastEntriesAnimations),
                activeOpacity: 1,
              }}
            >
              <View style={styles.secondaryItemContent}>
                <View style={[styles.secondaryIconBase, styles.secondaryIconPrimary]}>
                  <Icon name="history" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.secondaryTextContainer}>
                  <Text style={styles.secondaryCardTitle}>{t('home.actions.past.title')}</Text>
                  <Text style={styles.secondaryCardSubtitle}>
                    {t('home.actions.past.subtitle')}
                  </Text>
                </View>
                <View style={styles.secondaryMeta}>
                  <Text style={styles.secondaryActionExtra}>{t('home.actions.past.extra')}</Text>
                  <Icon name="chevron-right" size={20} color={theme.colors.primary} />
                </View>
              </View>
            </ThemedCard>
          </Animated.View>

          {/* Enhanced Calendar Card */}
          <Animated.View style={[styles.secondaryItemWrapper, dynamicStyles.calendarTransform]}>
            <ThemedCard
              density="comfortable"
              elevation="none"
              variant="outlined"
              onPress={onNavigateToCalendar}
              style={styles.secondaryCard}
              touchableProps={{
                onPressIn: () => handlePressIn(calendarAnimations),
                onPressOut: () => handlePressOut(calendarAnimations),
                activeOpacity: 1,
              }}
            >
              <View style={styles.secondaryItemContent}>
                <View style={[styles.secondaryIconBase, styles.secondaryIconSecondary]}>
                  <Icon name="calendar-month" size={20} color={theme.colors.secondary} />
                </View>
                <View style={styles.secondaryTextContainer}>
                  <Text style={styles.secondaryCardTitle}>{t('home.actions.calendar.title')}</Text>
                  <Text style={styles.secondaryCardSubtitle}>
                    {t('home.actions.calendar.subtitle')}
                  </Text>
                </View>
                <View style={styles.secondaryMeta}>
                  <Text style={styles.secondaryActionExtra}>
                    {t('home.actions.calendar.extra')}
                  </Text>
                  <Icon name="chevron-right" size={20} color={theme.colors.primary} />
                </View>
              </View>
            </ThemedCard>
          </Animated.View>

          {/* Enhanced Why Gratitude Card */}
          <Animated.View style={[styles.secondaryItemWrapper, dynamicStyles.whyGratitudeTransform]}>
            <ThemedCard
              density="comfortable"
              elevation="none"
              variant="outlined"
              onPress={onNavigateToWhyGratitude}
              style={styles.secondaryCard}
              touchableProps={{
                onPressIn: () => handlePressIn(whyGratitudeAnimations),
                onPressOut: () => handlePressOut(whyGratitudeAnimations),
                activeOpacity: 1,
              }}
            >
              <View style={styles.secondaryItemContent}>
                <View style={[styles.secondaryIconBase, styles.secondaryIconTertiary]}>
                  <Icon name="heart-outline" size={20} color={theme.colors.tertiary} />
                </View>
                <View style={styles.secondaryTextContainer}>
                  <Text style={styles.secondaryCardTitle}>{t('home.actions.why.title')}</Text>
                  <Text style={styles.secondaryCardSubtitle}>{t('home.actions.why.subtitle')}</Text>
                </View>
                <View style={styles.secondaryMeta}>
                  <Text style={styles.secondaryActionExtra}>{t('home.actions.why.extra')}</Text>
                  <Icon name="chevron-right" size={20} color={theme.colors.primary} />
                </View>
              </View>
            </ThemedCard>
          </Animated.View>
        </View>
      </View>
    );
  }
);

ActionCards.displayName = 'ActionCards';

const createStyles = (theme: AppTheme, colorMode: ReturnType<typeof useTheme>['colorMode']) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    primaryCardContainer: {
      borderRadius: theme.borderRadius.lg,
    },
    primaryCardFrame: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: getSurfaceColor(theme, 'base'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colorMode === 'dark' ? theme.colors.outline + '18' : theme.colors.outline + '10',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    primaryCardContent: {
      gap: theme.spacing.md,
    },
    primaryHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    primaryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
    },
    primaryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
      borderWidth: 0,
    },
    primaryTextContainer: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    primaryActionTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      lineHeight: 20,
    },
    primaryActionSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    primaryHeaderRight: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    progressBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      backgroundColor:
        colorMode === 'dark' ? theme.colors.primary + '22' : theme.colors.primaryContainer,
    },
    progressBadgeText: {
      ...theme.typography.labelSmall,
      color: colorMode === 'dark' ? theme.colors.primaryContainer : theme.colors.primary,
      fontWeight: '600',
    },
    secondaryList: {
      gap: theme.spacing.xs,
    },
    secondaryItemWrapper: {
      borderRadius: theme.borderRadius.lg,
    },
    secondaryCard: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: getSurfaceColor(theme, 'base'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colorMode === 'dark' ? theme.colors.outline + '18' : theme.colors.outline + '10',
    },
    secondaryItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    secondaryIconBase: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryIconPrimary: {
      backgroundColor: theme.colors.primaryContainer,
    },
    secondaryIconSecondary: {
      backgroundColor: theme.colors.secondaryContainer,
    },
    secondaryIconTertiary: {
      backgroundColor: theme.colors.tertiaryContainer,
    },
    secondaryTextContainer: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    secondaryCardTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    secondaryCardSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    secondaryMeta: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    secondaryActionExtra: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '600',
      textAlign: 'right',
    },
  });

export default ActionCards;
