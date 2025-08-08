import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useGratitudeEntriesPaginated } from '@/features/gratitude/hooks';
import { analyticsService } from '@/services/analyticsService';
import { safeErrorDisplay } from '@/utils/errorTranslation';
import PastEntriesHeader from '@/components/past-entries/PastEntriesHeader';
import PastEntryItem from '@/components/past-entries/PastEntryItem';
import PastEntriesEmptyState from '@/components/past-entries/PastEntriesEmptyState';
import PastEntriesErrorState from '@/components/past-entries/PastEntriesErrorState';
import PastEntriesSkeletonLoader from '@/components/past-entries/PastEntriesSkeletonLoader';
import type { AppTheme } from '@/themes/types';
import type { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { MainTabParamList, RootStackParamList } from '@/types/navigation';

// Define navigation prop types
type PastEntriesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'PastEntriesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * Enhanced Past Entries Screen - Modern edge-to-edge UI with beautiful visual hierarchy.
 *
 * Features:
 * - Full edge-to-edge design with proper safe area handling
 * - Floating header card with stats and progress
 * - Enhanced entry items with better content preview
 * - Improved loading, error, and empty states
 * - Smooth animations and interactions
 * - Maintains 100% TanStack Query functionality
 */
const PastEntriesScreen: React.FC = () => {
  const navigation = useNavigation<PastEntriesScreenNavigationProp>();
  const { theme } = useTheme();
  const { showSuccess, handleMutationError } = useGlobalError();
  const insets = useSafeAreaInsets();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGratitudeEntriesPaginated();

  // Flatten the paginated data into a single array
  const entries = useMemo(() => {
    if (!data?.pages) {
      return [];
    }
    return data.pages.flatMap((page) => page.entries);
  }, [data]);

  // Get total count from the first page (for future use)
  // const totalCount = data?.pages?.[0]?.totalCount || 0;

  useEffect(() => {
    analyticsService.logScreenView('PastEntriesScreen');
  }, []);

  // Enhanced error handling using centralized system
  useEffect(() => {
    if (isError && error) {
      handleMutationError(error, 'geçmiş kayıtları yükleme');
    }
  }, [isError, error, handleMutationError]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRetry = useCallback(() => {
    refetch();
    showSuccess('Yeniden yükleniyor...');
  }, [refetch, showSuccess]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleEntryPress = useCallback(
    (entry: GratitudeEntry) => {
      analyticsService.logEvent('past_entry_selected', {
        entry_id: entry.id !== undefined ? entry.id : null,
        entry_date: entry.entry_date !== undefined ? entry.entry_date : null,
      });

      navigation.navigate('EntryDetail', { entryId: entry.id || '', entryDate: entry.entry_date });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: GratitudeEntry; index: number }) => (
      <PastEntryItem entry={item} index={index} onPress={handleEntryPress} />
    ),
    [handleEntryPress]
  );

  const keyExtractor = useCallback(
    (item: GratitudeEntry, index: number) =>
      item.id?.toString() || item.entry_date?.toString() || 'entry-' + index.toString(),
    []
  );

  // Memoize the translated error message for consistency
  const translatedErrorMessage = useMemo(() => {
    return error ? safeErrorDisplay(error) : 'Geçmiş kayıtlar alınırken bir hata oluştu.';
  }, [error]);

  const styles = createStyles(theme, insets);

  // Loading state with enhanced skeleton
  if (isLoading && !isRefetching) {
    return (
      <View style={styles.edgeToEdgeContainer}>
        <StatusBar
          backgroundColor="transparent"
          translucent
          barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
        />
        <View style={styles.scrollableContent}>
          <PastEntriesHeader title="Minnet Kayıtlarınız" subtitle="Yükleniyor..." />
          <PastEntriesSkeletonLoader count={5} />
        </View>
      </View>
    );
  }

  // Error state with enhanced error UI
  if (isError && !isRefetching) {
    return (
      <View style={styles.edgeToEdgeContainer}>
        <StatusBar
          backgroundColor="transparent"
          translucent
          barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
        />
        <View style={styles.scrollableContent}>
          <PastEntriesHeader title="Minnet Kayıtlarınız" />
          <PastEntriesErrorState error={translatedErrorMessage} onRetry={handleRetry} />
        </View>
      </View>
    );
  }

  // Empty state with enhanced onboarding
  if (entries.length === 0 && !isRefetching) {
    return (
      <View style={styles.edgeToEdgeContainer}>
        <StatusBar
          backgroundColor="transparent"
          translucent
          barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
        />
        <View style={styles.scrollableContent}>
          <PastEntriesHeader title="Minnet Kayıtlarınız" />
          <PastEntriesEmptyState />
        </View>
      </View>
    );
  }

  // Main content with entries - Full edge-to-edge FlatList
  return (
    <View style={styles.edgeToEdgeContainer}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
      />
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <PastEntriesHeader title="Minnet Kayıtlarınız" entryCount={entries.length} />
        }
        ListFooterComponent={
          <View style={styles.footerContainer}>
            <View style={styles.paginationPill}>
              <Text style={styles.paginationText}>Sayfa {data?.pages?.length || 1}</Text>
            </View>
            {isFetchingNextPage ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingMoreText}>Daha fazla yükleniyor...</Text>
              </View>
            ) : hasNextPage ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => fetchNextPage()}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Daha fazla kayıt yükle"
              >
                <Text style={styles.loadMoreText}>Daha fazla</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // Ensure iOS adjusts content around keyboard properly
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
            title="Güncelleniyor..."
            titleColor={theme.colors.onSurfaceVariant}
          />
        }
        style={styles.list}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        // Enhanced scroll behavior
        bounces={true}
        bouncesZoom={false}
        alwaysBounceVertical={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

const createStyles = (
  theme: AppTheme,
  insets: { top: number; bottom: number; left: number; right: number }
) =>
  StyleSheet.create({
    // Edge-to-edge container with proper safe area handling
    edgeToEdgeContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollableContent: {
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom + theme.spacing.xl, // Extra space for better scrolling
    },
    listContent: {
      paddingTop: insets.top,
      paddingBottom: insets.bottom + theme.spacing.xxxl, // Extra space for better scrolling
    },
    list: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    footerContainer: {
      paddingTop: theme.spacing.md,
      paddingBottom: insets.bottom + theme.spacing.lg,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    paginationPill: {
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '25',
    },
    paginationText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: '700',
      ...theme.typography.labelSmall,
    },
    loadingMoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    loadingMoreText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    loadMoreButton: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
    },
    loadMoreText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
  });

export default PastEntriesScreen;
