import React, { useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import type { MoodEmoji } from '@/types/mood.types';
import { AppTheme } from '@/themes/types';

import { Attachment } from '@/schemas/gratitudeEntrySchema';
import AttachmentRail from '@/features/gratitude/components/AttachmentRail';

interface HomeGratitudeListItemProps {
  statement: string;
  moodEmoji: MoodEmoji | null;
  attachments?: Attachment[];
  onPress: () => void;
}

const HomeGratitudeListItem: React.FC<HomeGratitudeListItemProps> = React.memo(
  ({ statement, moodEmoji, attachments, onPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const pressAnim = useRef(new Animated.Value(1)).current;
    const mascotSource = useMemo(() => {
      const mascots = [
        require('@/assets/assets/mascot.png'),
        require('@/assets/assets/mascot1.png'),
        require('@/assets/assets/mascot2.png'),
      ];
      // Use the statement string to derive a consistent index
      const charCodeSum = statement.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return mascots[charCodeSum % mascots.length];
    }, [statement]);

    const handlePressIn = () => {
      Animated.spring(pressAnim, {
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.container}
          accessibilityRole="button"
          accessibilityLabel={t('home.todayList.itemA11y', {
            defaultValue: 'Today gratitude entry. {{statement}}',
            statement,
          })}
          accessibilityHint={t('home.todayList.itemHint', {
            defaultValue: 'Opens today entry details',
          })}
        >
          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Quote with styled background */}
            <View
              style={styles.quoteWrapper}
              accessible={true}
              accessibilityLabel={t('home.todayList.itemA11y', {
                defaultValue: 'Today gratitude entry. {{statement}}',
                statement,
              })}
            >
              <Icon name="format-quote-open" size={14} color={theme.colors.primary} />
              <Text style={styles.quoteText} numberOfLines={2}>
                {statement}
              </Text>
            </View>

            {attachments && attachments.length > 0 ? (
              <View style={styles.attachmentContainer}>
                <AttachmentRail attachments={attachments} />
              </View>
            ) : null}

            {/* Footer Row */}
            <View style={styles.footer}>
              <View style={styles.todayBadge}>
                <Icon name="clock-outline" size={12} color={theme.colors.primary} />
                <Text style={styles.todayText}>{t('pastEntries.item.relative.today')}</Text>
              </View>
              <View style={styles.rightSection}>
                {moodEmoji && <Text style={styles.moodEmoji}>{moodEmoji}</Text>}
                <Icon name="chevron-right" size={18} color={theme.colors.outline} />
              </View>
            </View>

            {/* Mascot Peek - Positioned to be visible but subtle */}
            <View style={styles.mascotPeekContainer} pointerEvents="none">
              <Image source={mascotSource} style={styles.mascotPeek} contentFit="contain" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

HomeGratitudeListItem.displayName = 'HomeGratitudeListItem';

export default HomeGratitudeListItem;

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + '08',
    },
    mainContent: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    quoteWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    quoteText: {
      flex: 1,
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 24,
      fontStyle: 'italic',
      fontFamily: theme.typography.fontFamilySerif || 'Lora-Regular',
      opacity: 0.9,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    todayBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '08',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      gap: 6,
    },
    todayText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingRight: 72, // Clear space for the mascot companion
    },
    moodEmoji: {
      fontSize: 18,
    },
    mascotPeekContainer: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 70,
      height: 70,
      zIndex: 0,
      opacity: 0.8,
    },
    mascotPeek: {
      width: '100%',
      height: '100%',
    },
    attachmentContainer: {
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.sm,
      width: '100%',
    },
  });
