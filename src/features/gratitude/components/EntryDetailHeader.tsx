import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';

interface EntryDetailHeaderProps {
  date: string;
  count: number;
}

const EntryDetailHeader: React.FC<EntryDetailHeaderProps> = ({ date, count }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ThemedCard variant="elevated" density="standard" elevation="card">
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="calendar-month-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.dateText}>{date}</Text>
            <Text style={styles.countText}>
              {count > 0 ? `${count} minnet ifadesi` : 'Henüz ifade eklenmemiş'}
            </Text>
          </View>
        </View>
      </ThemedCard>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    iconContainer: {
      backgroundColor: theme.colors.primaryContainer + '20',
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
    },
    textContainer: {
      flex: 1,
    },
    dateText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    countText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.8,
    },
  });

export default EntryDetailHeader;
