import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import LoadingSkeleton, {
  CircularSkeleton,
  TextSkeleton,
} from '@/shared/components/ui/LoadingSkeleton';

interface PastEntriesSkeletonLoaderProps {
  count?: number;
}

interface SkeletonItemProps {
  isRecent: boolean;
}

const SkeletonItem: React.FC<SkeletonItemProps> = ({ isRecent }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ThemedCard
        variant="elevated"
        density="comfortable"
        elevation="xs"
        style={styles.edgeToEdgeCard}
      >
        {/* Header skeleton */}
        <View style={styles.header}>
          <View style={styles.dateSection}>
            <View style={styles.dateHeader}>
              <LoadingSkeleton
                variant="rounded"
                width="65%"
                height={22}
                borderRadius={theme.borderRadius.xs}
              />
              {isRecent && <CircularSkeleton width={8} height={8} />}
            </View>
            <LoadingSkeleton
              variant="rounded"
              width="45%"
              height={12}
              borderRadius={theme.borderRadius.xs}
            />
          </View>
          <CircularSkeleton width={20} height={20} />
        </View>

        {/* Content skeleton */}
        <View style={styles.contentSection}>
          <TextSkeleton height={16} style={{ marginBottom: theme.spacing.xs }} />
          <TextSkeleton height={16} width="90%" style={{ marginBottom: theme.spacing.xs }} />
          <TextSkeleton height={16} width="70%" style={{ marginBottom: theme.spacing.xs }} />

          {/* Content meta skeleton */}
          <View style={styles.contentMeta}>
            <CircularSkeleton width={16} height={16} />
            <LoadingSkeleton
              variant="rounded"
              width={80}
              height={12}
              borderRadius={theme.borderRadius.xs}
            />
          </View>
        </View>

        {/* Footer skeleton */}
        <View style={styles.footer}>
          <View style={styles.statsContainer}>
            <View style={styles.statGroup}>
              <CircularSkeleton width={16} height={16} />
              <LoadingSkeleton
                variant="rounded"
                width={45}
                height={12}
                borderRadius={theme.borderRadius.xs}
              />
            </View>
            <View style={styles.statGroup}>
              <CircularSkeleton width={16} height={16} />
              <LoadingSkeleton
                variant="rounded"
                width={45}
                height={12}
                borderRadius={theme.borderRadius.xs}
              />
            </View>
          </View>

          <View style={styles.qualityContainer}>
            <LoadingSkeleton
              variant="rounded"
              width={50}
              height={18}
              borderRadius={theme.borderRadius.sm}
            />
            <CircularSkeleton width={16} height={16} />
          </View>
        </View>
      </ThemedCard>
    </View>
  );
};

const PastEntriesSkeletonLoader: React.FC<PastEntriesSkeletonLoaderProps> = ({ count = 4 }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.loaderContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} isRecent={index < 3} />
      ))}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    loaderContainer: {
      paddingTop: theme.spacing.md,
    },
    container: {
      paddingHorizontal: 0,
      marginBottom: theme.spacing.md,
    },
    edgeToEdgeCard: {
      borderRadius: 0,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '10',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.lg,
    },
    dateSection: {
      flex: 1,
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xxs,
    },
    contentSection: {
      marginBottom: theme.spacing.lg,
    },
    contentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    statGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    qualityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  });

export default PastEntriesSkeletonLoader;
