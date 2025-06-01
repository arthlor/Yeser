import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  // Ensure Animated is not imported if it was here
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getGratitudeEntries, GratitudeEntry } from '../api/gratitudeApi';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';

// Define navigation prop types
type PastEntriesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainAppTabParamList, 'PastEntriesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Enhanced version of SkeletonEntryItem with ThemedCard and improved animations
const EnhancedSkeletonEntryItem: React.FC = () => {
  const { theme } = useTheme();
  const styles = StyleSheet.create({
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

  const staticBackgroundColor = theme.colors.surfaceVariant; // Or another appropriate placeholder color

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
          <View
            style={[
              styles.datePlaceholder,
              { backgroundColor: staticBackgroundColor },
            ]}
          />
          <View
            style={[
              styles.iconPlaceholder,
              { backgroundColor: staticBackgroundColor },
            ]}
          />
        </View>

        {/* Content lines */}
        <View
          style={[
            styles.linePlaceholder,
            styles.line1,
            { backgroundColor: staticBackgroundColor },
          ]}
        />
        <View
          style={[
            styles.linePlaceholder,
            styles.line2,
            { backgroundColor: staticBackgroundColor },
          ]}
        />

        {/* Footer with entry count */}
        <View style={styles.footerContainer}>
          <View
            style={[
              styles.countPlaceholder,
              { backgroundColor: staticBackgroundColor },
            ]}
          />
        </View>
      </View>
    </ThemedCard>
  );
};

/**
 * EnhancedPastEntriesScreen provides an improved UI/UX for viewing past gratitude entries
 * with animations, card-based design, and improved interactions.
 */
const EnhancedPastEntriesScreen: React.FC = () => {
  const navigation = useNavigation<PastEntriesScreenNavigationProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // State for entries, loading, refreshing, and error
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Log screen view or other non-animation logic if needed
    analyticsService.logScreenView('EnhancedPastEntriesScreen'); // Assuming this was intended here or in useFocusEffect
  }, []);

  // Fetch entries from API - wrapped in useCallback to prevent dependency changes
  const fetchEntries = useCallback(
    async (isRefresh: boolean) => {
      console.log('[PastEntries] fetchEntries: Attempting to fetch entries...');
      try {
        setError(null);
        // if (!isRefresh) { // isLoading state handles this now
        //   console.log(
        //     '[PastEntries] fetchEntries: Not refreshing, showing loading animation.'
        //   );
        // }

        console.log(
          '[PastEntries] fetchEntries: Calling getGratitudeEntries().'
        );
        const fetchedEntries = await getGratitudeEntries();
        console.log(
          '[PastEntries] fetchEntries: getGratitudeEntries() succeeded. Count:',
          fetchedEntries.length
        );
        setEntries(fetchedEntries);

        // Log analytics event
        analyticsService.logEvent('past_entries_viewed', {
          entry_count: fetchedEntries.length,
        });
        console.log(
          '[PastEntries] fetchEntries: Successfully set entries and logged analytics.'
        );
      } catch (e: unknown) {
        console.error(
          '[PastEntries] fetchEntries: Error caught while fetching past entries:',
          e
        );
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
        if (!isRefresh) {
          setIsLoading(false); // Directly set loading state
        } else {
          setRefreshing(false);
        }
      }
    },
    [] // No animation dependencies
  );

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchEntries(false); // Not a refresh action
    }, [fetchEntries]) // Ensure fetchEntries is stable
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEntries(true); // This is a refresh action
  }, [fetchEntries]);

  const handleEntryPress = (entry: GratitudeEntry) => {
    // Apply haptic feedback here if available

    // Log analytics event
    analyticsService.logEvent('past_entry_selected', {
      // Convert undefined to null for analytics
      entry_id: entry.id !== undefined ? entry.id : null,
      entry_date: entry.entry_date !== undefined ? entry.entry_date : null,
    });

    navigation.navigate('EntryDetail', { entry });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderItem = ({
    item,
    index: _index, // Aliased to _index as index is not used in the function body
  }: {
    item: GratitudeEntry;
    index: number; // The prop from FlatList is still 'index'
  }) => {
    // Calculate entry date
    const entryDate = item.created_at
      ? new Date(item.created_at)
      : new Date(item.entry_date);

    // Format content for display
    const contentLines = item.content.split('\n');
    const displayContent =
      contentLines.length > 1
        ? `${contentLines[0]}${contentLines.length > 1 ? '...' : ''}`
        : item.content;

    return (
      <View style={styles.itemContainer}>
        <ThemedCard
          variant="elevated"
          elevation="sm"
          contentPadding="md"
          style={styles.card}
        >
          <TouchableOpacity
            onPress={() => handleEntryPress(item)}
            style={styles.cardContent}
            activeOpacity={0.7}
            accessibilityLabel={`Şükran kaydı: ${formatDate(entryDate)}`}
            accessibilityHint="Detayları görüntülemek için dokunun"
          >
            <View style={styles.cardHeader}>
              <Text style={styles.entryDate}>{formatDate(entryDate)}</Text>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>

            <Text style={styles.entryTextSnippet} numberOfLines={2}>
              {displayContent}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.entryCount}>
                {contentLines.length > 1
                  ? `${contentLines.length} madde`
                  : '1 madde'}
              </Text>
            </View>
          </TouchableOpacity>
        </ThemedCard>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.title}>Geçmiş Girdiler</Text>
      {/* Sticky title can be conditionally rendered or removed if not essential without animation */}
      {/* <Text style={styles.stickyHeaderTitle}>Geçmiş Girdiler</Text> */}
    </View>
  );

  const renderSkeletonLoader = () => (
    <View style={styles.listContentContainer}>
      {Array.from({ length: 5 }).map((_, index) => (
        <EnhancedSkeletonEntryItem key={`skeleton-${index}`} />
      ))}
    </View>
  );

  if (isLoading && !refreshing) {
    // Show skeleton items during initial load
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Şükran Kayıtlarınız</Text>
        {renderSkeletonLoader()}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Şükran Kayıtlarınız</Text>
        <View style={styles.centeredContainer}>
          <ThemedCard
            variant="filled"
            contentPadding="lg"
            style={styles.errorCard}
          >
            <Icon
              name="alert-circle-outline"
              size={48}
              color={theme.colors.error}
              style={styles.errorIcon}
            />
            <Text style={styles.errorText}>{error}</Text>
            <ThemedButton
              title="Yeniden Dene"
              onPress={() => fetchEntries(false)} // Not a refresh action
              style={styles.retryButton}
            />
          </ThemedCard>
        </View>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Şükran Kayıtlarınız</Text>
        <View style={styles.centeredContainer}>
          <View style={styles.emptyStateContainer}>
            <Icon
              name="book-outline"
              size={64}
              color={theme.colors.primary}
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateTitle}>
              Henüz şükran kaydınız bulunmuyor
            </Text>
            <Text style={styles.emptyStateText}>
              Şükran kayıtlarınız burada görünecek. İlk şükran kaydınızı eklemek
              için "Günlük Giriş" ekranına gidin.
            </Text>
            <ThemedButton
              title="Şükran Ekle"
              onPress={() => navigation.navigate('DailyEntryTab')}
              style={styles.emptyStateButton}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şükran Kayıtlarınız</Text>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          item.id?.toString() ||
          item.entry_date?.toString() ||
          'entry-' + index.toString()
        }
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      />

      {/* Conditionally rendered loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents={'auto'}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: theme.spacing.md,
    },
    title: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    centeredContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    listContentContainer: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    itemContainer: {
      marginBottom: theme.spacing.md,
    },
    card: {
      overflow: 'hidden',
    },
    cardContent: {
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    entryDate: {
      ...theme.typography.titleMedium,
      color: theme.colors.primary,
    },
    entryTextSnippet: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.sm,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    entryCount: {
      ...theme.typography.labelSmall,
      color: theme.colors.textSecondary,
    },
    errorCard: {
      backgroundColor: theme.colors.errorContainer,
      alignItems: 'center',
      maxWidth: 350,
    },
    errorIcon: {
      marginBottom: theme.spacing.md,
    },
    errorText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onErrorContainer,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      marginTop: theme.spacing.sm,
    },
    emptyStateContainer: {
      alignItems: 'center',
      padding: theme.spacing.lg,
      maxWidth: 350,
    },
    emptyStateIcon: {
      marginBottom: theme.spacing.md,
    },
    emptyStateTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    emptyStateText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    emptyStateButton: {
      marginTop: theme.spacing.md,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
  });

export default EnhancedPastEntriesScreen;
