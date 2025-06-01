import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';
import ThemedCard from './ThemedCard';

/**
 * EnhancedSkeletonEntryItem provides an improved loading placeholder
 * for gratitude entry items with smoother animations and proper theming.
 */
const EnhancedSkeletonEntryItem: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const backgroundColor = theme.colors.surfaceVariant; // Static background

  return (
    <ThemedCard
      variant="elevated"
      elevation="sm"
      contentPadding="md"
      style={styles.card}
    >
      <View style={styles.itemContainer}>
        {/* Header with date placeholder and icon */}
        <View style={styles.headerContainer}>
          <View style={[styles.datePlaceholder, { backgroundColor }]} />
          <View style={[styles.iconPlaceholder, { backgroundColor }]} />
        </View>

        {/* Content lines */}
        <View
          style={[styles.linePlaceholder, styles.line1, { backgroundColor }]}
        />
        <View
          style={[styles.linePlaceholder, styles.line2, { backgroundColor }]}
        />

        {/* Footer with entry count */}
        <View style={styles.footerContainer}>
          <View style={[styles.countPlaceholder, { backgroundColor }]} />
        </View>
      </View>
    </ThemedCard>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
    },
    itemContainer: {
      width: '100%',
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    datePlaceholder: {
      width: '40%',
      height: theme.typography.titleMedium.fontSize,
      borderRadius: theme.borderRadius.sm,
    },
    iconPlaceholder: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    linePlaceholder: {
      width: '100%',
      height: theme.typography.bodyMedium.fontSize,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.sm,
    },
    line1: {
      width: '95%',
    },
    line2: {
      width: '75%',
    },
    footerContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.xs,
    },
    countPlaceholder: {
      width: '20%',
      height: theme.typography.labelSmall.fontSize,
      borderRadius: theme.borderRadius.sm,
    },
  });

export default EnhancedSkeletonEntryItem;
