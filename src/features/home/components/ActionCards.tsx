/* eslint-disable react-native/no-color-literals */
import React, { useCallback, useMemo } from 'react';
import { Animated, Platform, StyleSheet, Text, Vibration, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getPrimaryShadow, getSurfaceColor } from '@/themes/utils';
import { useTranslation } from 'react-i18next';

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
    const dynamicStyles = useMemo(
      () => ({
        primaryCardTransform: {
          transform: primaryAnimations.combinedTransform,
          opacity: primaryAnimations.fadeAnim,
        },
        pastEntriesTransform: [
          styles.cardWrapper,
          {
            transform: pastEntriesAnimations.combinedTransform,
            opacity: pastEntriesAnimations.fadeAnim,
          },
        ],
        calendarTransform: [
          styles.cardWrapper,
          {
            transform: calendarAnimations.combinedTransform,
            opacity: calendarAnimations.fadeAnim,
          },
        ],
        whyGratitudeTransform: [
          styles.cardWrapper,
          {
            transform: whyGratitudeAnimations.combinedTransform,
            opacity: whyGratitudeAnimations.fadeAnim,
          },
        ],
      }),
      [primaryAnimations, pastEntriesAnimations, calendarAnimations, whyGratitudeAnimations, styles]
    );

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
        return t('home.inspiration.progress.start.message');
      }
      const remaining = Math.max(dailyGoal - currentCount, 0);
      return t('home.inspiration.progress.progress.message', { remaining });
    }, [primaryAction, currentCount, dailyGoal, t]);

    return (
      <View style={styles.container}>
        {/* Enhanced Primary Action Card - Edge-to-Edge */}
        {primaryAction && (
          <Animated.View style={dynamicStyles.primaryCardTransform}>
            <ThemedCard
              variant="outlined"
              density="comfortable"
              elevation="none"
              onPress={onNavigateToEntry}
              style={styles.primaryCardFrame}
              containerStyle={styles.primaryCardContainer}
              touchableProps={{
                onPressIn: () => handlePressIn(primaryAnimations),
                onPressOut: () => handlePressOut(primaryAnimations),
                activeOpacity: 1,
              }}
            >
              <View style={styles.primaryCardContent}>
                <View style={styles.primaryIconContainer}>
                  <Icon name={primaryAction.icon} size={26} color={theme.colors.primary} />
                </View>
                <View style={styles.primaryTextContainer}>
                  <Text style={styles.primaryActionTitle} numberOfLines={1}>
                    {primaryAction.title}
                  </Text>
                  {!!primarySubtitle && (
                    <Text style={styles.primaryActionSubtitle} numberOfLines={1}>
                      {primarySubtitle}
                    </Text>
                  )}
                </View>
                <View style={styles.chevronContainer}>
                  <Icon name="chevron-right" size={26} color={theme.colors.primary} />
                </View>
              </View>
            </ThemedCard>
          </Animated.View>
        )}

        {/* Enhanced Secondary Action Cards - Edge-to-Edge Grid */}
        <ThemedCard
          variant="elevated"
          density="compact"
          elevation="card"
          style={styles.secondaryCardsFrame}
        >
          <View style={styles.secondaryCardsGrid}>
            {/* Enhanced Past Entries Card */}
            <Animated.View style={dynamicStyles.pastEntriesTransform}>
              <ThemedCard
                density="compact"
                elevation="none"
                onPress={onNavigateToPastEntries}
                style={styles.secondaryCard}
                touchableProps={{
                  onPressIn: () => handlePressIn(pastEntriesAnimations),
                  onPressOut: () => handlePressOut(pastEntriesAnimations),
                  activeOpacity: 1,
                }}
              >
                <View style={styles.secondaryCardContent}>
                  <View style={styles.primaryIconBg}>
                    <Icon name="history" size={22} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.secondaryCardTitle} numberOfLines={1}>
                    {t('home.actions.past.title')}
                  </Text>
                </View>
              </ThemedCard>
            </Animated.View>

            {/* Enhanced Calendar Card */}
            <Animated.View style={dynamicStyles.calendarTransform}>
              <ThemedCard
                density="compact"
                elevation="none"
                onPress={onNavigateToCalendar}
                style={styles.secondaryCard}
                touchableProps={{
                  onPressIn: () => handlePressIn(calendarAnimations),
                  onPressOut: () => handlePressOut(calendarAnimations),
                  activeOpacity: 1,
                }}
              >
                <View style={styles.secondaryCardContent}>
                  <View style={styles.secondaryIconBg}>
                    <Icon name="calendar-month" size={22} color={theme.colors.secondary} />
                  </View>
                  <Text style={styles.secondaryCardTitle} numberOfLines={1}>
                    {t('home.actions.calendar.title')}
                  </Text>
                </View>
              </ThemedCard>
            </Animated.View>

            {/* Enhanced Why Gratitude Card */}
            <Animated.View style={dynamicStyles.whyGratitudeTransform}>
              <ThemedCard
                density="compact"
                elevation="none"
                onPress={onNavigateToWhyGratitude}
                style={styles.secondaryCard}
                touchableProps={{
                  onPressIn: () => handlePressIn(whyGratitudeAnimations),
                  onPressOut: () => handlePressOut(whyGratitudeAnimations),
                  activeOpacity: 1,
                }}
              >
                <View style={styles.secondaryCardContent}>
                  <View style={styles.tertiaryIconBg}>
                    <Icon name="heart-outline" size={22} color={theme.colors.tertiary} />
                  </View>
                  <Text style={styles.secondaryCardTitle} numberOfLines={1}>
                    {t('home.actions.why.title')}
                  </Text>
                </View>
              </ThemedCard>
            </Animated.View>
          </View>
        </ThemedCard>
      </View>
    );
  }
);

ActionCards.displayName = 'ActionCards';

const createStyles = (theme: AppTheme, colorMode: ReturnType<typeof useTheme>['colorMode']) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sm,
    },
    // Edge-to-edge primary card with theme-aware design
    primaryCardFrame: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: getSurfaceColor(theme, 'base'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colorMode === 'dark' ? theme.colors.outline + '12' : theme.colors.outline + '10',
      minHeight: 120,
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    primaryCardContainer: {
      marginBottom: theme.spacing.md,
    },
    primaryCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 88,
    },
    primaryIconContainer: {
      width: 42,
      height: 42,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline,
    },
    primaryTextContainer: {
      flex: 1,
    },
    primaryActionTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
      fontWeight: '700',
      lineHeight: 20,
    },
    primaryActionSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      fontSize: 12,
      lineHeight: 16,
    },
    progressText: {
      display: 'none',
    },
    chevronContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: colorMode === 'dark' ? theme.colors.surface : theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline,
    },
    progressIndicator: { height: 0 },
    progressBar: { height: 0 },
    // Edge-to-edge secondary cards container with theme awareness
    secondaryCardsFrame: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor:
        colorMode === 'dark' ? theme.colors.outline + '20' : theme.colors.outline + '15',
      borderBottomColor:
        colorMode === 'dark' ? theme.colors.outline + '20' : theme.colors.outline + '15',
      ...getPrimaryShadow.card(theme),
      minHeight: 140,
    },
    secondaryCardsGrid: {
      flexDirection: 'row',
      paddingHorizontal: 0,
      gap: theme.spacing.xs,
    },
    cardWrapper: {
      flex: 1,
      marginHorizontal: 0,
      minWidth: 0,
    },
    // Individual secondary card items with enhanced theme adaptation
    secondaryCard: {
      flex: 1,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colorMode === 'dark' ? theme.colors.outline + '20' : theme.colors.outline + '15',
    },
    secondaryCardContent: {
      alignItems: 'center',
      minHeight: 100,
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
    // Enhanced icon containers with better dark theme contrast
    primaryIconBg: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
      borderWidth: 0,
    },
    secondaryIconBg: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
      borderWidth: 0,
    },
    tertiaryIconBg: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.tertiaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
      borderWidth: 0,
    },
    // Enhanced typography with better dark theme readability
    secondaryCardTitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      fontWeight: '600',
      lineHeight: 16,
      fontSize: 12,
    },
    secondaryCardSubtitle: {
      display: 'none',
    },
    secondaryCardExtra: {
      display: 'none',
    },
  });

export default ActionCards;
