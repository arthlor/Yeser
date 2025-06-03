import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';

import PastEntriesEmptyState from '@/components/past-entries/PastEntriesEmptyState';
import PastEntriesErrorState from '@/components/past-entries/PastEntriesErrorState';
import PastEntriesHeader from '@/components/past-entries/PastEntriesHeader';
import PastEntriesSkeletonLoader from '@/components/past-entries/PastEntriesSkeletonLoader';
import PastEntryItem from '@/components/past-entries/PastEntryItem';

import { getGratitudeDailyEntries } from '../api/gratitudeApi';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';

import type { GratitudeEntry } from '../schemas/gratitudeEntrySchema';

// Modular Components

// Define navigation prop types
type PastEntriesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainAppTabParamList, 'PastEntriesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * Enhanced Past Entries Screen with modular components and improved UI/UX
 */
const EnhancedPastEntriesScreen: React.FC = () => {
  const navigation = useNavigation<PastEntriesScreenNavigationProp>();
  const { theme, colorMode } = useTheme();
  const styles = createStyles(theme);

  // State management
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyticsService.logScreenView('EnhancedPastEntriesScreen');
  }, []);

  // Fetch entries from API
  const fetchEntries = useCallback(async (isRefresh = false) => {
    console.log('[PastEntries] fetchEntries: Attempting to fetch entries...');
    try {
      setError(null);

      if (!isRefresh) {
        setIsLoading(true);
      } else {
        setRefreshing(true);
      }

      console.log('[PastEntries] fetchEntries: Calling API...');
      const fetchedEntries = await getGratitudeDailyEntries();
      console.log('[PastEntries] fetchEntries: Success. Count:', fetchedEntries.length);

      setEntries(fetchedEntries);

      analyticsService.logEvent('past_entries_viewed', {
        entry_count: fetchedEntries.length,
      });
    } catch (e: unknown) {
      console.error('[PastEntries] fetchEntries: Error:', e);
      let errorMessage = 'Geçmiş kayıtlar alınırken bir hata oluştu.';
      if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
      ) {
        errorMessage = (e as { message: string }).message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      setError(errorMessage);
    } finally {
      console.log('[PastEntries] fetchEntries: Process finished.');
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEntries(false);
    }, [fetchEntries])
  );

  const handleRefresh = useCallback(() => {
    fetchEntries(true);
  }, [fetchEntries]);

  const handleRetry = useCallback(() => {
    fetchEntries(false);
  }, [fetchEntries]);

  const handleEntryPress = useCallback(
    (entry: GratitudeEntry) => {
      analyticsService.logEvent('past_entry_selected', {
        entry_id: entry.id !== undefined ? entry.id : null,
        entry_date: entry.entry_date !== undefined ? entry.entry_date : null,
      });

      navigation.navigate('EntryDetail', { entry });
    },
    [navigation]
  );

  const handleCreateEntry = useCallback(() => {
    navigation.navigate('DailyEntryTab');
  }, [navigation]);

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

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={colorMode === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <PastEntriesHeader title="Minnet Kayıtlarınız" subtitle="Yükleniyor..." />
        <PastEntriesSkeletonLoader count={6} />
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={colorMode === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <PastEntriesHeader title="Minnet Kayıtlarınız" />
        <PastEntriesErrorState error={error} onRetry={handleRetry} />
      </SafeAreaView>
    );
  }

  // Empty state
  if (entries.length === 0 && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={colorMode === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <PastEntriesHeader title="Minnet Kayıtlarınız" />
        <PastEntriesEmptyState onCreateEntry={handleCreateEntry} />
      </SafeAreaView>
    );
  }

  // Main content with entries
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={colorMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <PastEntriesHeader title="Minnet Kayıtlarınız" entryCount={entries.length} />

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        // Enhanced performance optimizations
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={100}
        windowSize={15}
        initialNumToRender={8}
        getItemLayout={(data, index) => ({
          length: 120,
          offset: 120 * index,
          index,
        })}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
      paddingBottom: theme.spacing.xxl,
      paddingTop: theme.spacing.xs,
    },
  });

export default EnhancedPastEntriesScreen;
