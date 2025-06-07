import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, RefreshControl, StatusBar, StyleSheet, View } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useGratitudeEntriesPaginated } from '@/features/gratitude/hooks';
import { analyticsService } from '@/services/analyticsService';
import PastEntriesHeader from '@/components/past-entries/PastEntriesHeader';
import PastEntryItem from '@/components/past-entries/PastEntryItem';
import PastEntriesEmptyState from '@/components/past-entries/PastEntriesEmptyState';
import PastEntriesErrorState from '@/components/past-entries/PastEntriesErrorState';
import PastEntriesSkeletonLoader from '@/components/past-entries/PastEntriesSkeletonLoader';
import type { AppTheme } from '@/themes/types';
import type { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { MainAppTabParamList, RootStackParamList } from '@/types/navigation';

// Define navigation prop types
type PastEntriesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainAppTabParamList, 'PastEntriesTab'>,
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

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

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

      navigation.navigate('EntryDetail', { entryDate: entry.entry_date });
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
          <PastEntriesErrorState
            error={error?.message || 'Geçmiş kayıtlar alınırken bir hata oluştu.'}
            onRetry={handleRetry}
          />
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  });

export default PastEntriesScreen;
