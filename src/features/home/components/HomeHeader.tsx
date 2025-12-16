import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';

interface HomeHeaderProps {
  greeting: string;
  username?: string | null;
  currentCount: number; // Kept for interface compatibility but not used visually in header anymore
  dailyGoal: number; // Kept for interface compatibility
  currentStreak: number; // Kept for interface compatibility
  onStreakPress?: () => void;
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = React.memo(
  ({ greeting, username, avatarUrl, onAvatarPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const name = username || '';

    const initial = useMemo(() => {
      const trimmed = (username || '').trim();
      return trimmed ? trimmed.charAt(0).toUpperCase() : '🙂';
    }, [username]);

    return (
      <View style={styles.container}>
        {/* Main Row: Avatar + Greeting */}
        <View style={styles.mainRow}>
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

          {/* Greeting Section */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText} numberOfLines={1} adjustsFontSizeToFit>
              {greeting}
            </Text>
            {name ? (
              <Text style={styles.nameText} numberOfLines={1} adjustsFontSizeToFit>
                {name}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }
);

HomeHeader.displayName = 'HomeHeader';

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 2,
      borderColor: theme.colors.primary + '40',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 32,
    },
    avatarText: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '700',
    },
    greetingContainer: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: theme.spacing.md,
    },
    greetingText: {
      ...theme.typography.displaySmall,
      color: theme.colors.onBackground,
      fontWeight: '700',
      fontFamily: 'Lora-Bold',
      letterSpacing: -0.5,
      lineHeight: 38,
    },
    nameText: {
      ...theme.typography.displaySmall,
      color: theme.colors.primary,
      fontWeight: '400',
      fontFamily: 'Lora-Regular',
      letterSpacing: -0.5,
      lineHeight: 38,
    },
  });

export default HomeHeader;
