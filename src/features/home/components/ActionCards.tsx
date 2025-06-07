import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';

import React, { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ActionCardsProps {
  currentCount: number;
  dailyGoal: number;
  onNavigateToEntry: () => void;
  onNavigateToPastEntries: () => void;
  onNavigateToCalendar: () => void;
}

  const ActionCards: React.FC<ActionCardsProps> = React.memo(
    ({
      currentCount,
      dailyGoal,
      onNavigateToEntry,
      onNavigateToPastEntries,
      onNavigateToCalendar,
    }) => {
            const { theme } = useTheme();
      const styles = useMemo(() => createStyles(theme), [theme]);

      // Animation values for micro-interactions
      const primaryCardScale = useRef(new Animated.Value(1)).current;
      const pastEntriesScale = useRef(new Animated.Value(1)).current;
      const calendarScale = useRef(new Animated.Value(1)).current;

      // Memoize dynamic styles to prevent object creation on every render
      const dynamicStyles = useMemo(() => ({
        primaryCardTransform: { transform: [{ scale: primaryCardScale }] },
        pastEntriesTransform: [styles.cardWrapper, { transform: [{ scale: pastEntriesScale }] }],
        calendarTransform: [styles.cardWrapper, { transform: [{ scale: calendarScale }] }],
        primaryIconBg: [
          styles.secondaryIconContainer,
          { backgroundColor: theme.colors.primaryContainer },
        ],
        secondaryIconBg: [
          styles.secondaryIconContainer,
          { backgroundColor: theme.colors.secondaryContainer },
        ],
      }), [theme, primaryCardScale, pastEntriesScale, calendarScale, styles]);

    const handlePressIn = useCallback((animValue: Animated.Value) => {
      // Haptic feedback for iOS
      if (Platform.OS === 'ios') {
        // Light haptic feedback
        Vibration.vibrate(10);
      }

      Animated.spring(animValue, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, []);

    const handlePressOut = useCallback((animValue: Animated.Value) => {
      Animated.spring(animValue, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, []);

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
        {/* Enhanced Primary Action Card - Only show when goal not completed */}
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
                onPressIn: () => handlePressIn(primaryCardScale),
                onPressOut: () => handlePressOut(primaryCardScale),
                activeOpacity: 1,
              }}
            >
              <View style={styles.primaryCardContent}>
                <View style={styles.primaryIconContainer}>
                  <Icon name={primaryAction.icon} size={24} color={theme.colors.onPrimary} />
                </View>
                <View style={styles.primaryTextContainer}>
                  <Text style={styles.primaryActionTitle}>{primaryAction.title}</Text>
                  <Text style={styles.primaryActionSubtitle}>{primaryAction.subtitle}</Text>
                  <Text style={styles.progressText}>{primaryAction.progressText}</Text>
                </View>
                <View style={styles.chevronContainer}>
                  <Icon
                    name="chevron-right"
                    size={24}
                    color={theme.colors.onPrimary}
                    style={styles.chevronIcon}
                  />
                </View>
              </View>

              {/* Progress indicator */}
              <View style={styles.progressIndicator}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min((currentCount / dailyGoal) * 100, 100)}%`,
                      backgroundColor: theme.colors.onPrimary + '60',
                    },
                  ]}
                />
              </View>
            </ThemedCard>
          </Animated.View>
        )}

        {/* Enhanced Secondary Action Cards - Edge-to-Edge Container */}
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
                elevation="xs"
                onPress={onNavigateToPastEntries}
                style={styles.secondaryCard}
                touchableProps={{
                  onPressIn: () => handlePressIn(pastEntriesScale),
                  onPressOut: () => handlePressOut(pastEntriesScale),
                  activeOpacity: 1,
                }}
              >
                <View style={styles.secondaryCardContent}>
                  <View style={dynamicStyles.primaryIconBg}>
                    <Icon name="history" size={20} color={theme.colors.primary} />
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
                elevation="xs"
                onPress={onNavigateToCalendar}
                style={styles.secondaryCard}
                touchableProps={{
                  onPressIn: () => handlePressIn(calendarScale),
                  onPressOut: () => handlePressOut(calendarScale),
                  activeOpacity: 1,
                }}
              >
                <View style={styles.secondaryCardContent}>
                  <View style={dynamicStyles.secondaryIconBg}>
                    <Icon name="calendar-month" size={20} color={theme.colors.secondary} />
                  </View>
                  <Text style={styles.secondaryCardTitle}>Takvim</Text>
                  <Text style={styles.secondaryCardSubtitle}>Görünümü</Text>
                  <Text style={styles.secondaryCardExtra}>Planlayın</Text>
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
      marginBottom: theme.spacing.md,
    },
    // Edge-to-edge primary card
    primaryCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      ...getPrimaryShadow.floating(theme),
    },
    primaryCardContainer: {
      marginBottom: theme.spacing.md,
    },
    primaryCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      // Padding handled by density="comfortable"
    },
    primaryIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.onPrimary + '25',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    primaryTextContainer: {
      flex: 1,
    },
    primaryActionTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimary,
      marginBottom: theme.spacing.xs,
      fontWeight: '600',
    },
    primaryActionSubtitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onPrimary + 'DD',
      marginBottom: theme.spacing.xs,
      fontWeight: '500',
    },
    progressText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onPrimary + 'BB',
    },
    chevronContainer: {
      padding: theme.spacing.xs,
    },
    chevronIcon: {
      opacity: 0.9,
    },
    progressIndicator: {
      height: 3,
      backgroundColor: theme.colors.onPrimary + '30',
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      borderRadius: 2,
      overflow: 'hidden',
      // Horizontal margin removed - handled by card density
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    // Edge-to-edge secondary cards container
    secondaryCardsContainer: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      ...getPrimaryShadow.card(theme),
    },
    secondaryCardsGrid: {
      flexDirection: 'row',
      // Padding handled by density="compact"
    },
    cardWrapper: {
      flex: 1,
      marginHorizontal: theme.spacing.xs,
    },
    // Individual secondary card items (no shadows, subtle backgrounds)
    secondaryCard: {
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceVariant + '20',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '15',
      // No shadows on individual items
    },
    secondaryCardContent: {
      alignItems: 'center',
      minHeight: 75,
      justifyContent: 'center',
      padding: theme.spacing.sm,
    },
    secondaryIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xs,
    },
    secondaryCardTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: 2,
      fontWeight: '600',
    },
    secondaryCardSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: 2,
      fontWeight: '500',
    },
    secondaryCardExtra: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  });

export default ActionCards;
