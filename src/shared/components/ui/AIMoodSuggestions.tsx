import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';
import type { MoodEmoji } from '@/types/mood.types';
import { AIUsageIndicator } from './AIUsageIndicator';

interface AIMoodSuggestionsProps {
  suggestedMoods: MoodEmoji[];
  primaryMood: MoodEmoji | null;
  remaining: number | null;
  isLoading: boolean;
  onSelectMood: (mood: MoodEmoji) => void;
  style?: ViewStyle;
}

/**
 * AI Mood Suggestions component that displays suggested moods as tappable chips.
 * Shows below the text input in StatementEditCard when in edit mode.
 */
export const AIMoodSuggestions: React.FC<AIMoodSuggestionsProps> = ({
  suggestedMoods,
  primaryMood,
  remaining,
  isLoading,
  onSelectMood,
  style,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Don't render if no suggestions and not loading
  if (suggestedMoods.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Text style={styles.label}>
          {isLoading
            ? t('ai.mood.analyzing', '✨ Analyzing...')
            : t('ai.mood.suggests', '✨ AI suggests:')}
        </Text>

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.moodChips}>
            {suggestedMoods.map((mood, index) => (
              <TouchableOpacity
                key={`${mood}-${index}`}
                style={[styles.chip, mood === primaryMood && styles.primaryChip]}
                onPress={() => onSelectMood(mood)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{mood}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <AIUsageIndicator remaining={remaining} isLoading={isLoading} />
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      gap: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    label: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    loader: {
      marginLeft: theme.spacing.xs,
    },
    moodChips: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    chip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
    },
    primaryChip: {
      backgroundColor: theme.colors.primaryContainer,
      borderColor: theme.colors.primary + '50',
    },
    chipText: {
      fontSize: 18,
    },
  });

export default AIMoodSuggestions;
