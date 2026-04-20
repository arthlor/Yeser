import React, { useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { GratitudeEntry, Attachment } from '@/schemas/gratitudeEntrySchema';
import { AppTheme } from '@/themes/types';
import { useTheme } from '@/providers/ThemeProvider';
import { getCurrentLocale } from '@/utils/localeUtils';
import AttachmentRail from '@/features/gratitude/components/AttachmentRail';

interface PastEntryItemProps {
  entry: GratitudeEntry;
  index: number;
  onPress: (entry: GratitudeEntry) => void;
}

const PastEntryItem: React.FC<PastEntryItemProps> = ({ entry, index, onPress }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const entryDate = entry.entry_date ? new Date(entry.entry_date) : new Date();
  const isRecent = index < 3;
  const statementCount = entry.statements?.length || 0;
  const pressAnim = useRef(new Animated.Value(1)).current;

  // Mascot Selection Logic
  const mascotSource = useMemo(() => {
    const mascots = [
      require('@/assets/assets/mascot.png'),
      require('@/assets/assets/mascot1.png'),
      require('@/assets/assets/mascot2.png'),
    ];
    return mascots[index % mascots.length];
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getRelativeDate = (date: Date) => {
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('pastEntries.item.relative.today');
    }
    if (diffDays === 1) {
      return t('pastEntries.item.relative.yesterday');
    }
    if (diffDays < 7) {
      return t('pastEntries.item.relative.days', { count: diffDays });
    }
    if (diffDays < 30) {
      return t('pastEntries.item.relative.weeks', { count: Math.floor(diffDays / 7) });
    }
    return t('pastEntries.item.relative.months', { count: Math.floor(diffDays / 30) });
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(getCurrentLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });

  const firstStatement = entry.statements?.[0] || '';
  const hasMore = statementCount > 1;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pressAnim }] }]}>
      {/* Background Reflection Stack Visual */}
      {hasMore && (
        <>
          <View style={[styles.stackLayer, styles.stackLayer1]} />
          <View style={[styles.stackLayer, styles.stackLayer2]} />
        </>
      )}

      {/* Mascot Peek (Rendered later to be on top) */}

      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => onPress(entry)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* Editorial Date Section */}
        <View style={styles.dateContainer}>
          <Text style={styles.dayNumber}>{entryDate.getDate()}</Text>
          <Text style={styles.monthText}>
            {entryDate.toLocaleDateString(getCurrentLocale(), { month: 'short' }).toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={[styles.relativeDate, isRecent && styles.recentText]}>
            {getRelativeDate(entryDate)}
          </Text>
          <Text style={styles.fullDate}>{formatDate(entryDate)}</Text>
          {isRecent && (
            <View style={styles.recentBadge}>
              <Icon name="clock-fast" size={10} color={theme.colors.primary} />
              <Text style={styles.recentBadgeText}>{t('pastEntries.item.new')}</Text>
            </View>
          )}
        </View>

        <View style={styles.reflectionCountContainer}>
          <Text style={styles.reflectionCountText}>
            {statementCount} {t('pastEntries.item.reflections')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Quote Row with Decorative Elements */}
      {firstStatement ? (
        <TouchableOpacity
          style={styles.quoteRow}
          onPress={() => onPress(entry)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {/* Decorative Large Quote Mark */}
          <View style={styles.decorativeQuoteContainer}>
            <Icon
              name="format-quote-open"
              size={120}
              color={theme.colors.primary + '08'}
              style={styles.decorativeQuote}
            />
          </View>

          <View style={styles.quoteContent}>
            <Text
              style={styles.quoteText}
              numberOfLines={4}
              accessible={true}
              accessibilityLabel={firstStatement}
            >
              {firstStatement}
            </Text>
            {entry.attachments && entry.attachments.length > 0 ? (
              <View style={styles.attachmentContainer}>
                <AttachmentRail attachments={entry.attachments as Attachment[]} />
              </View>
            ) : null}
            {hasMore && (
              <Text style={styles.moreText}>
                + {statementCount - 1} {t('pastEntries.item.more')}
              </Text>
            )}
          </View>
          <View style={styles.chevronContainer}>
            <Icon name="chevron-right" size={24} color={theme.colors.outline + '40'} />
          </View>

          {/* Mascot Peek - Inside the Touchable to be visible */}
          <View style={styles.mascotPeekContainer} pointerEvents="none">
            <Image
              source={mascotSource}
              style={styles.mascotPeek}
              contentFit="contain"
              transition={1000}
            />
          </View>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      overflow: 'visible', // Allow stack to show
      position: 'relative',
      zIndex: 1,
    },
    stackLayer: {
      position: 'absolute',
      height: '100%',
      width: '94%',
      left: '3%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderColor: theme.colors.outline + '10',
      borderWidth: 1,
    },
    stackLayer1: {
      bottom: -6,
      zIndex: -1,
      opacity: 0.5,
      transform: [{ scale: 0.98 }],
    },
    stackLayer2: {
      bottom: -12,
      zIndex: -2,
      opacity: 0.2,
      transform: [{ scale: 0.96 }],
    },
    mascotPeekContainer: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 100,
      height: 100,
      zIndex: 0,
      opacity: 0.8,
    },
    mascotPeek: {
      width: '100%',
      height: '100%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    dateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
    },
    dayNumber: {
      fontFamily: theme.typography.fontFamilySerif || 'Lora-Bold',
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 28,
      lineHeight: 32,
    },
    monthText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 2,
      marginTop: -2,
    },
    headerTextContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    relativeDate: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    recentText: {
      color: theme.colors.secondary,
    },
    fullDate: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
      opacity: 0.7,
    },
    recentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.secondary + '15',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.full,
      gap: 4,
      alignSelf: 'flex-start',
      marginTop: 6,
    },
    recentBadgeText: {
      ...theme.typography.labelSmall,
      color: theme.colors.secondary,
      fontWeight: '800',
      fontSize: 8,
      textTransform: 'uppercase',
    },
    reflectionCountContainer: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.md,
    },
    reflectionCountText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '700',
      fontSize: 9,
      textTransform: 'uppercase',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.outline + '08',
      marginHorizontal: theme.spacing.lg,
    },
    quoteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingRight: 96, // Clear space for the larger mascot companion
      position: 'relative',
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: theme.borderRadius.xl,
      borderBottomRightRadius: theme.borderRadius.xl,
    },
    decorativeQuoteContainer: {
      position: 'absolute',
      top: -20,
      left: 0,
      zIndex: 0,
    },
    decorativeQuote: {
      transform: [{ rotate: '0deg' }],
    },
    quoteContent: {
      flex: 1,
      zIndex: 1,
    },
    quoteTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    dropCapText: {
      fontFamily:
        theme.typography.fontFamilySerifBold || theme.typography.fontFamilySerif || 'Lora-Bold',
      fontSize: 42,
      lineHeight: 48,
      color: theme.colors.primary,
      marginRight: theme.spacing.xs,
      marginTop: -4,
    },
    quoteText: {
      flex: 1,
      ...theme.typography.bodyLarge,
      fontFamily: theme.typography.fontFamilySerif || 'Lora-Regular',
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      lineHeight: 26,
      opacity: 0.9,
    },
    moreText: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      fontWeight: '700',
      marginTop: 8,
      textTransform: 'lowercase',
    },
    chevronContainer: {
      marginLeft: theme.spacing.sm,
      opacity: 0.5,
    },
    attachmentContainer: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      width: '100%',
    },
  });

export default PastEntryItem;
