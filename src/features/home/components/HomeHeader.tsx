import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Icon removed with pills and add button
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';
import ThemedCard from '@/shared/components/ui/ThemedCard';

interface HomeHeaderProps {
  greeting: string;
  username?: string | null;
  currentCount: number;
  dailyGoal: number;
  currentStreak: number;
  onStreakPress?: () => void;
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = React.memo(
  ({
    greeting,
    username,
    currentCount: _currentCount,
    dailyGoal: _dailyGoal,
    currentStreak: _currentStreak,
    onStreakPress: _onStreakPress,
    avatarUrl,
    onAvatarPress,
  }) => {
    const { theme, colorMode } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme, colorMode), [theme, colorMode]);

    const name = username || '';
    // Progress bar removed; keep calculations out of header for a cleaner look

    const initial = useMemo(() => {
      const trimmed = (username || '').trim();
      return trimmed ? trimmed.charAt(0).toUpperCase() : '🙂';
    }, [username]);

    return (
      <ThemedCard variant="elevated" density="comfortable" elevation="card" style={styles.edgeCard}>
        <View style={styles.headerRow}>
          <View style={styles.leftGroup}>
            <TouchableOpacity
              style={styles.avatar}
              accessibilityRole="imagebutton"
              accessibilityLabel={t('home.header.avatar.a11y', {
                name: name || t('home.header.guest'),
              })}
              onPress={onAvatarPress}
              disabled={!onAvatarPress}
              activeOpacity={0.8}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={120}
                />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.greetingText} numberOfLines={1}>
              {greeting}
              {name ? `, ${name}` : ''}
            </Text>
          </View>
          {/* Removed add button; persistent FAB is used on HomeScreen */}
        </View>

        {/* Removed inline pills; stats now live in StatsRow */}
      </ThemedCard>
    );
  }
);

HomeHeader.displayName = 'HomeHeader';

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  colorMode: ReturnType<typeof useTheme>['colorMode']
) =>
  StyleSheet.create({
    // Subtle outline that is slightly stronger in dark mode
    // Using computed variables within styles context is not supported,
    // so we expand values inline below where needed.
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    greetingText: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
      fontWeight: '700',
      letterSpacing: -0.2,
      flexShrink: 1,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceVariant,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 22,
    },
    avatarText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '700',
    },
    // iconButton removed
    // progress styles removed
    edgeCard: {
      borderRadius: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor:
        colorMode === 'dark' ? theme.colors.outline + '20' : theme.colors.outline + '15',
      borderBottomColor:
        colorMode === 'dark' ? theme.colors.outline + '20' : theme.colors.outline + '15',
    },
  });

export default HomeHeader;
