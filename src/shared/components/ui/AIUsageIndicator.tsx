import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';

interface AIUsageIndicatorProps {
  remaining: number | null;
  resetInSeconds?: number | null;
  isLoading?: boolean;
  style?: ViewStyle;
  showAlways?: boolean; // Override to always show
}

/**
 * Subtle AI usage indicator that shows used/total and remaining.
 * Format: "✨ 5/25 used (20 left)"
 */
export const AIUsageIndicator: React.FC<AIUsageIndicatorProps> = ({
  remaining,
  resetInSeconds = null,
  isLoading = false,
  style,
  showAlways = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [timeLeft, setTimeLeft] = React.useState<number | null>(resetInSeconds);

  React.useEffect(() => {
    if (resetInSeconds !== null && resetInSeconds !== undefined) {
      setTimeLeft(resetInSeconds);
    }
  }, [resetInSeconds]);

  React.useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const DAILY_LIMIT = 25;

  // Don't show if null (not loaded yet)
  if (remaining === null) {
    return null;
  }

  // Determine urgency level for styling
  const isLow = remaining <= 5;
  const isExhausted = remaining === 0;

  // Show if explicit override OR if usage is significant (e.g. at least 1 used) OR if low
  // User requested to provide a subtle warning about credits used and left, so we should probably show it more often
  // Let's show it if we have used at least one credit, or if showAlways is true.
  const used = DAILY_LIMIT - remaining;
  const shouldShow = showAlways || used > 0;

  if (!shouldShow) {
    return null;
  }

  if (isExhausted) {
    return (
      <View style={[styles.container, styles.exhausted, style]}>
        <Text style={styles.exhaustedText}>
          {timeLeft !== null && timeLeft > 0
            ? t('ai.usage.resets_in', 'Daily limit exhausted. Resets in {{time}}', {
                time: formatTime(timeLeft),
              })
            : t('ai.usage.exhausted', 'Daily limit exhausted. Resets tomorrow!')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isLow && styles.lowUsage, style]}>
      {isLoading ? (
        <Text style={[styles.text, isLow && styles.lowText]}>✨</Text>
      ) : (
        <Text style={[styles.text, isLow && styles.lowText]}>
          {t('ai.usage.indicator', '✨ {{used}}/{{limit}} used ({{remaining}} left)', {
            used,
            limit: DAILY_LIMIT,
            remaining,
          })}
        </Text>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: theme.borderRadius.sm,
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surfaceVariant + '20', // Subtle background
    },
    text: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.9,
      fontSize: 11,
    },
    lowUsage: {
      backgroundColor: theme.colors.errorContainer + '30',
    },
    lowText: {
      color: theme.colors.error,
      opacity: 1,
    },
    exhausted: {
      backgroundColor: theme.colors.errorContainer + '40',
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    exhaustedText: {
      ...theme.typography.labelSmall,
      color: theme.colors.error,
      fontWeight: '500',
    },
  });

export default AIUsageIndicator;
