import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import type { MoodEmoji } from '@/types/mood.types';

interface HomeGratitudeListItemProps {
  statement: string;
  moodEmoji: MoodEmoji | null;
  onPress: () => void;
}

const HomeGratitudeListItem: React.FC<HomeGratitudeListItemProps> = React.memo(
  ({ statement, moodEmoji, onPress }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.touch}>
        <ThemedCard variant="outlined" density="compact" elevation="none" style={styles.card}>
          <View style={styles.row}>
            <View style={styles.quoteBar} />
            <Text style={styles.text} numberOfLines={3}>
              {statement}
            </Text>
            {moodEmoji && (
              <View style={styles.moodPill}>
                <Text style={styles.moodText}>{moodEmoji}</Text>
              </View>
            )}
          </View>
        </ThemedCard>
      </TouchableOpacity>
    );
  }
);

HomeGratitudeListItem.displayName = 'HomeGratitudeListItem';

export default HomeGratitudeListItem;

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    touch: { width: '100%' },
    card: { borderRadius: theme.borderRadius.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    quoteBar: {
      width: 3,
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
      opacity: 0.9,
      alignSelf: 'stretch',
    },
    text: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      flex: 1,
    },
    moodPill: {
      minWidth: 28,
      height: 28,
      borderRadius: 14,
      paddingHorizontal: theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '30',
    },
    moodText: {
      fontSize: 16,
    },
  });
