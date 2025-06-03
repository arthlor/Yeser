import React from 'react';
import { View, StyleSheet } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface PastEntriesSkeletonLoaderProps {
  count?: number;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    loaderContainer: {
      paddingTop: theme.spacing.md,
    },
    container: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    dateSection: {
      flex: 1,
    },
    placeholder: {
      backgroundColor: theme.colors.surfaceVariant + '80',
      borderRadius: theme.borderRadius.sm,
    },
    relativeDatePlaceholder: {
      width: '55%',
      height: 16,
      marginBottom: 4,
    },
    fullDatePlaceholder: {
      width: '75%',
      height: 12,
    },
    iconPlaceholder: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    contentSection: {
      marginBottom: theme.spacing.lg,
    },
    contentLine1: {
      width: '100%',
      height: 14,
      marginBottom: theme.spacing.xs,
    },
    contentLine2: {
      width: '85%',
      height: 14,
      marginBottom: theme.spacing.xs,
    },
    contentLine3: {
      width: '65%',
      height: 14,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statsPlaceholder: {
      width: '20%',
      height: 12,
    },
    tagPlaceholder: {
      width: 45,
      height: 18,
      borderRadius: theme.borderRadius.full,
    },
  });

const SkeletonItem: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <View style={styles.dateSection}>
            <View style={[styles.placeholder, styles.relativeDatePlaceholder]} />
            <View style={[styles.placeholder, styles.fullDatePlaceholder]} />
          </View>
          <View style={[styles.placeholder, styles.iconPlaceholder]} />
        </View>

        {/* Content skeleton */}
        <View style={styles.contentSection}>
          <View style={[styles.placeholder, styles.contentLine1]} />
          <View style={[styles.placeholder, styles.contentLine2]} />
          <View style={[styles.placeholder, styles.contentLine3]} />
        </View>

        {/* Footer skeleton */}
        <View style={styles.footer}>
          <View style={[styles.placeholder, styles.statsPlaceholder]} />
          <View style={[styles.placeholder, styles.tagPlaceholder]} />
        </View>
      </View>
    </View>
  );
};

const PastEntriesSkeletonLoader: React.FC<PastEntriesSkeletonLoaderProps> = ({ count = 4 }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.loaderContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} />
      ))}
    </View>
  );
};

export default PastEntriesSkeletonLoader;
