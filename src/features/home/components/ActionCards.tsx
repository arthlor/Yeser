import React, { useCallback, useMemo } from 'react';
import { Animated, Platform, StyleSheet, Text, Vibration, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getPrimaryShadow } from '@/themes/utils';

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
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

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
        progressBarWidth: {
          width: `${Math.min((currentCount / dailyGoal) * 100, 100)}%` as const,
        },
      }),
      [
        primaryAnimations,
        pastEntriesAnimations,
        calendarAnimations,
        whyGratitudeAnimations,
        styles,
        currentCount,
        dailyGoal,
      ]
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
      const progress = currentCount / dailyGoal;

      if (currentCount === 0) {
        return {
          title: 'Bugünün İlk Minnetini Ekle',
          subtitle: 'Güne minnetle başlayın',
          icon: 'plus-circle',
          progressText: 'Henüz başlamadınız',
        };
      }

      if (currentCount >= dailyGoal) {
        return null; // Don't show primary action when goal is completed
      }

      return {
        title: 'Bugünün Minnetlerini Tamamla',
        subtitle: `${dailyGoal - currentCount} minnet daha`,
        icon: 'heart-plus',
        progressText: `${Math.round(progress * 100)}% tamamlandı`,
      };
    }, [currentCount, dailyGoal]);

    const primaryAction = getPrimaryActionData;

    return (
      <View style={styles.container}>
        {/* Enhanced Primary Action Card - Edge-to-Edge */}
        {primaryAction && (
          <Animated.View style={dynamicStyles.primaryCardTransform}>
            <ThemedCard
              variant="elevated"
              density="comfortable"
              elevation="floating"
              onPress={onNavigateToEntry}
              style={styles.primaryCard}
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
                  <Text style={styles.primaryActionTitle}>{primaryAction.title}</Text>
                  <Text style={styles.primaryActionSubtitle}>{primaryAction.subtitle}</Text>
                  <Text style={styles.progressText}>{primaryAction.progressText}</Text>
                </View>
                <View style={styles.chevronContainer}>
                  <Icon name="chevron-right" size={26} color={theme.colors.primary} />
                </View>
              </View>

              {/* Enhanced Progress indicator with theme awareness */}
              <View style={styles.progressIndicator}>
                <View style={[styles.progressBar, dynamicStyles.progressBarWidth]} />
              </View>
            </ThemedCard>
          </Animated.View>
        )}

        {/* Enhanced Secondary Action Cards - Edge-to-Edge Grid */}
        <ThemedCard
          variant="elevated"
          density="compact"
          elevation="card"
          style={styles.secondaryCardsContainer}
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
                  <Text style={styles.secondaryCardTitle}>Geçmiş</Text>
                  <Text style={styles.secondaryCardSubtitle}>Kayıtlarınız</Text>
                  <Text style={styles.secondaryCardExtra}>Keşfedin</Text>
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
                  <Text style={styles.secondaryCardTitle}>Takvim</Text>
                  <Text style={styles.secondaryCardSubtitle}>Görünümü</Text>
                  <Text style={styles.secondaryCardExtra}>Planlayın</Text>
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
                  <Text style={styles.secondaryCardTitle}>Minnetin</Text>
                  <Text style={styles.secondaryCardSubtitle}>Gücü</Text>
                  <Text style={styles.secondaryCardExtra}>Öğrenin</Text>
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

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
    },
    // Edge-to-edge primary card with theme-aware design
    primaryCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.primaryContainer,
      borderWidth: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline,
      borderBottomColor: theme.colors.outline,
      ...getPrimaryShadow.floating(theme),
    },
    primaryCardContainer: {
      marginBottom: theme.spacing.lg,
    },
    primaryCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
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
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimaryContainer,
      marginBottom: theme.spacing.xs,
      fontWeight: '700',
      lineHeight: 22,
    },
    primaryActionSubtitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onPrimaryContainer,
      marginBottom: theme.spacing.xs,
      fontWeight: '500',
      opacity: 0.8,
      lineHeight: 18,
    },
    progressText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '400',
      opacity: 0.7,
    },
    chevronContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline,
    },
    progressIndicator: {
      height: 4,
      backgroundColor: theme.colors.outline,
      marginTop: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      overflow: 'hidden',
      opacity: 0.4,
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
    },
    // Edge-to-edge secondary cards container with theme awareness
    secondaryCardsContainer: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      borderBottomColor: theme.colors.outlineVariant,
      ...getPrimaryShadow.card(theme),
    },
    secondaryCardsGrid: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.xs,
    },
    cardWrapper: {
      flex: 1,
      marginHorizontal: theme.spacing.xs,
    },
    // Individual secondary card items with enhanced theme adaptation
    secondaryCard: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 0,
    },
    secondaryCardContent: {
      alignItems: 'center',
      minHeight: 90,
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
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      fontWeight: '700',
      lineHeight: 18,
    },
    secondaryCardSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      fontWeight: '500',
      lineHeight: 16,
    },
    secondaryCardExtra: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      textAlign: 'center',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });

export default ActionCards;
