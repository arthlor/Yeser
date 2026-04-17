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

          {/* Mascot Decorative Image */}
          <View style={styles.mascotContainer}>
            <Image
              source={require('@/assets/assets/mascot.png')}
              style={styles.mascotImage}
              contentFit="contain"
              transition={400}
            />
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
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xs,
      paddingTop: theme.spacing.md,
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1.5,
      borderColor: theme.colors.primary + '30',
      shadowColor: theme.colors.scrim,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 26,
    },
    avatarText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '700',
    },
    greetingContainer: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: theme.spacing.md,
      paddingRight: 120,
    },
    greetingText: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamilySerif || 'Lora-Regular',
      letterSpacing: -0.2,
      lineHeight: 28,
      opacity: 0.8,
    },
    nameText: {
      ...theme.typography.displaySmall,
      color: theme.colors.primary,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamilySerifBold || 'Lora-Bold',
      letterSpacing: -0.8,
      lineHeight: 40,
      marginTop: -2,
    },
    mascotContainer: {
      position: 'absolute',
      right: -30,
      top: -15,
      width: 180,
      height: 180,
      zIndex: -1, // Sits behind the greeting text but above surface
      opacity: 0.9,
      transform: [{ rotate: '-5deg' }, { scaleX: -1 }],
    },
    mascotImage: {
      width: '100%',
      height: '100%',
    },
  });

export default HomeHeader;
