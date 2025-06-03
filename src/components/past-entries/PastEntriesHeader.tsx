import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface PastEntriesHeaderProps {
  title: string;
  subtitle?: string;
  entryCount?: number;
}

const PastEntriesHeader: React.FC<PastEntriesHeaderProps> = ({ title, subtitle, entryCount }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getSubtitleText = () => {
    if (subtitle) return subtitle;
    if (entryCount !== undefined) {
      const lastUpdate = new Date().toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      });
      return `${entryCount} kayıt • ${lastUpdate}`;
    }
    return undefined;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {getSubtitleText() && <Text style={styles.subtitle}>{getSubtitleText()}</Text>}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.onBackground,
      letterSpacing: -0.5,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.1,
      opacity: 0.8,
    },
  });

export default PastEntriesHeader;
