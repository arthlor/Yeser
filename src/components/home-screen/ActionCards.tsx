import React, { useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import ThemedCard from '@/components/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

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
          title: 'Bugünün İlk Şükranını Ekle',
          subtitle: 'Güne minnetle başlayın',
          icon: 'plus-circle',
          gradient: ['#667eea', '#764ba2'],
          progressText: 'Henüz başlamadınız',
        };
      }

      if (currentCount >= dailyGoal) {
        return {
          title: 'Daha Fazla Şükran Ekle',
          subtitle: 'Hedefinizi geçtiniz! Harika! 🎉',
          icon: 'star-plus',
          gradient: ['#11998e', '#38ef7d'],
          progressText: 'Hedef tamamlandı!',
        };
      }

      return {
        title: 'Bugünün Şükranlarını Tamamla',
        subtitle: `${dailyGoal - currentCount} şükran daha`,
        icon: 'heart-plus',
        gradient: ['#667eea', '#764ba2'],
        progressText: `${Math.round(progress * 100)}% tamamlandı`,
      };
    }, [currentCount, dailyGoal]);

    const primaryAction = getPrimaryActionData;

    return (
      <View style={styles.container}>
        {/* Enhanced Primary Action Card */}
        <Animated.View style={{ transform: [{ scale: primaryCardScale }] }}>
          <ThemedCard style={styles.primaryCard}>
            <TouchableOpacity
              style={styles.primaryCardContent}
              onPress={onNavigateToEntry}
              onPressIn={() => {
                handlePressIn(primaryCardScale);
              }}
              onPressOut={() => {
                handlePressOut(primaryCardScale);
              }}
              activeOpacity={1}
            >
              <View style={styles.primaryIconContainer}>
                <Icon name={primaryAction.icon} size={32} color={theme.colors.onPrimary} />
              </View>
              <View style={styles.primaryTextContainer}>
                <Text style={styles.primaryActionTitle}>{primaryAction.title}</Text>
                <Text style={styles.primaryActionSubtitle}>{primaryAction.subtitle}</Text>
                <Text style={styles.progressText}>{primaryAction.progressText}</Text>
              </View>
              <View style={styles.chevronContainer}>
                <Icon
                  name="chevron-right"
                  size={28}
                  color={theme.colors.onPrimary}
                  style={styles.chevronIcon}
                />
              </View>
            </TouchableOpacity>

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

        {/* Enhanced Secondary Action Cards */}
        <View style={styles.secondaryCardsContainer}>
          {/* Enhanced Past Entries Card */}
          <Animated.View style={[styles.cardWrapper, { transform: [{ scale: pastEntriesScale }] }]}>
            <ThemedCard style={styles.secondaryCard}>
              <TouchableOpacity
                style={styles.secondaryCardContent}
                onPress={onNavigateToPastEntries}
                onPressIn={() => {
                  handlePressIn(pastEntriesScale);
                }}
                onPressOut={() => {
                  handlePressOut(pastEntriesScale);
                }}
                activeOpacity={1}
              >
                <View style={[styles.secondaryIconContainer, { backgroundColor: '#E8F4FD' }]}>
                  <Icon name="history" size={26} color="#1976D2" />
                </View>
                <Text style={styles.secondaryCardTitle}>Geçmiş</Text>
                <Text style={styles.secondaryCardSubtitle}>Kayıtlarınız</Text>
                <Text style={styles.secondaryCardExtra}>Keşfedin</Text>
              </TouchableOpacity>
            </ThemedCard>
          </Animated.View>

          {/* Enhanced Calendar Card */}
          <Animated.View style={[styles.cardWrapper, { transform: [{ scale: calendarScale }] }]}>
            <ThemedCard style={styles.secondaryCard}>
              <TouchableOpacity
                style={styles.secondaryCardContent}
                onPress={onNavigateToCalendar}
                onPressIn={() => {
                  handlePressIn(calendarScale);
                }}
                onPressOut={() => {
                  handlePressOut(calendarScale);
                }}
                activeOpacity={1}
              >
                <View style={[styles.secondaryIconContainer, { backgroundColor: '#F3E5F5' }]}>
                  <Icon name="calendar-month" size={26} color="#7B1FA2" />
                </View>
                <Text style={styles.secondaryCardTitle}>Takvim</Text>
                <Text style={styles.secondaryCardSubtitle}>Görünümü</Text>
                <Text style={styles.secondaryCardExtra}>Planlayın</Text>
              </TouchableOpacity>
            </ThemedCard>
          </Animated.View>
        </View>
      </View>
    );
  }
);

ActionCards.displayName = 'ActionCards';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
    primaryCard: {
      marginBottom: theme.spacing.xl,
      borderRadius: theme.borderRadius.xl + 4,
      elevation: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.primary,
    },
    primaryCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    primaryIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.onPrimary + '25',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.lg,
    },
    primaryTextContainer: {
      flex: 1,
    },
    primaryActionTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: theme.colors.onPrimary,
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    primaryActionSubtitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.onPrimary + 'DD',
      marginBottom: 2,
    },
    progressText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.onPrimary + 'BB',
      letterSpacing: 0.2,
    },
    chevronContainer: {
      padding: theme.spacing.sm,
    },
    chevronIcon: {
      opacity: 0.9,
    },
    progressIndicator: {
      height: 4,
      backgroundColor: theme.colors.onPrimary + '30',
      marginHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    secondaryCardsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    cardWrapper: {
      flex: 1,
    },
    secondaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
    },
    secondaryCardContent: {
      alignItems: 'center',
      padding: theme.spacing.lg,
      minHeight: 140,
      justifyContent: 'center',
    },
    secondaryIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    secondaryCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    secondaryCardSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: 4,
    },
    secondaryCardExtra: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.primary,
      textAlign: 'center',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
  });

export default ActionCards;
