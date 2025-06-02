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
  StatusBar,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getGratitudeDailyEntries } from '../api/gratitudeApi';
import type { GratitudeEntry } from '../schemas/gratitudeEntrySchema';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';

const { width: screenWidth } = Dimensions.get('window');

// Define navigation prop types
type PastEntriesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainAppTabParamList, 'PastEntriesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Enhanced skeleton loader with improved animations and spacing
const EnhancedSkeletonEntryItem: React.FC = () => {
  const { theme } = useTheme();
  const styles = StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
    },
    itemContainer: {
      width: '100%',
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    datePlaceholder: {
      width: '45%',
      height: 18,
      borderRadius: theme.borderRadius.md,
    },
    iconPlaceholder: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    linePlaceholder: {
      height: 16,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.sm,
    },
    line1: {
      width: '100%',
    },
    line2: {
      width: '80%',
    },
    line3: {
      width: '60%',
    },
    footerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    countPlaceholder: {
      width: '25%',
      height: 14,
      borderRadius: theme.borderRadius.sm,
    },
    tagPlaceholder: {
      width: 60,
      height: 24,
      borderRadius: theme.borderRadius.full,
    },
  });

  const placeholderColor = theme.colors.surfaceVariant;

  return (
    <ThemedCard
      variant="elevated"
      elevation="md"
      contentPadding="lg"
      style={styles.card}
    >
      <View style={styles.itemContainer}>
        <View style={styles.headerContainer}>
          <View
            style={[
              styles.datePlaceholder,
              { backgroundColor: placeholderColor },
            ]}
          />
          <View
            style={[
              styles.iconPlaceholder,
              { backgroundColor: placeholderColor },
            ]}
          />
        </View>

        <View
          style={[
            styles.linePlaceholder,
            styles.line1,
            { backgroundColor: placeholderColor },
          ]}
        />
        <View
          style={[
            styles.linePlaceholder,
            styles.line2,
            { backgroundColor: placeholderColor },
          ]}
        />
        <View
          style={[
            styles.linePlaceholder,
            styles.line3,
            { backgroundColor: placeholderColor },
          ]}
        />

        <View style={styles.footerContainer}>
          <View
            style={[
              styles.countPlaceholder,
              { backgroundColor: placeholderColor },
            ]}
          />
          <View
            style={[
              styles.tagPlaceholder,
              { backgroundColor: placeholderColor },
            ]}
          />
        </View>
      </View>
    </ThemedCard>
  );
};

// Header component with improved styling
const ScreenHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { theme } = useTheme();
  
  const styles = StyleSheet.create({
    headerContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      backgroundColor: theme.colors.background,
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      opacity: 0.8,
    },
  });

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

/**
 * EnhancedPastEntriesScreen with improved UI/UX, better spacing, and modern design
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
    analyticsService.logScreenView('EnhancedPastEntriesScreen');
  }, []);

  // Fetch entries from API
  const fetchEntries = useCallback(
    async (isRefresh: boolean) => {
      console.log('[PastEntries] fetchEntries: Attempting to fetch entries...');
      try {
        setError(null);
        
        console.log('[PastEntries] fetchEntries: Calling getGratitudeEntries().');
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
        if (!isRefresh) {
          setIsLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchEntries(false);
    }, [fetchEntries])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEntries(true);
  }, [fetchEntries]);

  const handleEntryPress = (entry: GratitudeEntry) => {
    analyticsService.logEvent('past_entry_selected', {
      entry_id: entry.id !== undefined ? entry.id : null,
      entry_date: entry.entry_date !== undefined ? entry.entry_date : null,
    });

    navigation.navigate('EntryDetail', { entry });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getRelativeDate = (date: Date) => {
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    return formatDate(date);
  };

  const renderItem = ({ item }: { item: GratitudeEntry }) => {
    const entryDate = item.entry_date ? new Date(item.entry_date) : new Date();

    let displayContent = 'Henüz bir şükran kaydı eklenmemiş.';
    if (item.statements && item.statements.length > 0) {
      // Show first statement with better formatting
      displayContent = item.statements[0];
      if (displayContent.length > 100) {
        displayContent = displayContent.substring(0, 100) + '...';
      }
    }

    const statementCount = item.statements?.length || 0;
    const isRecent = entries.indexOf(item) < 3; // Highlight recent entries

    return (
      <View style={styles.itemContainer}>
        <ThemedCard
          variant="elevated"
          elevation={isRecent ? "lg" : "md"}
          contentPadding="lg"
          style={{
            ...styles.card,
            ...(isRecent ? styles.recentCard : {}),
          }}
        >
          <TouchableOpacity
            onPress={() => handleEntryPress(item)}
            style={styles.cardContent}
            activeOpacity={0.8}
            accessibilityLabel={`Minnet kaydı: ${getRelativeDate(entryDate)}`}
            accessibilityHint="Detayları görüntülemek için dokunun"
          >
            <View style={styles.cardHeader}>
              <View style={styles.dateContainer}>
                <Text style={styles.relativeDate}>{getRelativeDate(entryDate)}</Text>
                <Text style={styles.fullDate}>{formatDate(entryDate)}</Text>
              </View>
              <View style={styles.headerIconContainer}>
                {isRecent && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>YENİ</Text>
                  </View>
                )}
                <Icon
                  name="chevron-right"
                  size={24}
                  color={theme.colors.textSecondary}
                  style={styles.chevronIcon}
                />
              </View>
            </View>

            <Text style={styles.entryTextSnippet} numberOfLines={3}>
              {displayContent}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.statsContainer}>
                <Icon
                  name="format-list-bulleted"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.entryCount}>
                  {statementCount} madde
                </Text>
              </View>
              <View style={styles.gratitudeTag}>
                <Icon
                  name="heart"
                  size={14}
                  color={theme.colors.primary}
                />
                <Text style={styles.gratitudeTagText}>Minnet</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ThemedCard>
      </View>
    );
  };

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 4 }).map((_, index) => (
        <EnhancedSkeletonEntryItem key={`skeleton-${index}`} />
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateContent}>
        <View style={styles.emptyStateIconContainer}>
          <Icon
            name="book-heart"
            size={80}
            color={theme.colors.primary}
            style={styles.emptyStateIcon}
          />
        </View>
        <Text style={styles.emptyStateTitle}>
          İlk şükran kaydınızı oluşturun
        </Text>
        <Text style={styles.emptyStateDescription}>
          Günlük şükran kayıtlarınız burada görünecek. Mutluluğunuzu artırmak ve 
          hayatınızdaki güzel anları hatırlamak için ilk kaydınızı oluşturun.
        </Text>
        <ThemedButton
          title="Minnet Ekle"
          onPress={() => navigation.navigate('DailyEntryTab')}
          style={styles.emptyStateButton}
        />
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <ThemedCard
        variant="filled"
        contentPadding="xl"
        style={styles.errorCard}
      >
        <Icon
          name="alert-circle"
          size={64}
          color={theme.colors.error}
          style={styles.errorIcon}
        />
        <Text style={styles.errorTitle}>Bir sorun oluştu</Text>
        <Text style={styles.errorText}>{error}</Text>
        <ThemedButton
          title="Yeniden Dene"
          onPress={() => fetchEntries(false)}
          style={styles.retryButton}
        />
      </ThemedCard>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <ScreenHeader title="Minnet Kayıtlarınız" subtitle="Yükleniyor..." />
        {renderSkeletonLoader()}
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <ScreenHeader title="Minnet Kayıtlarınız" />
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <ScreenHeader title="Minnet Kayıtlarınız" />
        {renderEmptyState()}
      </SafeAreaView>
    );
  }

  const subtitle = `${entries.length} kayıt • Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <ScreenHeader title="Minnet Kayıtlarınız" subtitle={subtitle} />
      
      <FlatList
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
            progressBackgroundColor={theme.colors.surface}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents={'auto'}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Güncelleniyor...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    skeletonContainer: {
      paddingTop: theme.spacing.md,
    },
    listContentContainer: {
      paddingBottom: theme.spacing.xxl,
    },
    separator: {
      height: theme.spacing.sm,
    },
    itemContainer: {
      paddingHorizontal: theme.spacing.md,
    },
    card: {
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
    },
    recentCard: {
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
      backgroundColor: theme.colors.primaryContainer + '10',
    },
    cardContent: {
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    dateContainer: {
      flex: 1,
    },
    relativeDate: {
      ...theme.typography.titleMedium,
      color: theme.colors.primary,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    fullDate: {
      ...theme.typography.labelMedium,
      color: theme.colors.textSecondary,
    },
    headerIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    newBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    newBadgeText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimary,
      fontWeight: '700',
      fontSize: 10,
    },
    chevronIcon: {
      opacity: 0.7,
    },
    entryTextSnippet: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: (theme.typography.bodyLarge.fontSize ?? 16) * 1.5,
      marginBottom: theme.spacing.lg,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    entryCount: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    gratitudeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    gratitudeTagText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '500',
    },
    // Empty State
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyStateContent: {
      alignItems: 'center',
      maxWidth: 320,
    },
    emptyStateIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.primaryContainer + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    emptyStateIcon: {
      opacity: 0.8,
    },
    emptyStateTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
      textAlign: 'center',
      fontWeight: '600',
      marginBottom: theme.spacing.md,
    },
    emptyStateDescription: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: (theme.typography.bodyLarge.fontSize ?? 16) * 1.4,
      marginBottom: theme.spacing.xxl,
    },
    emptyStateButton: {
      minWidth: 160,
    },
    // Error State
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    errorCard: {
      backgroundColor: theme.colors.errorContainer,
      alignItems: 'center',
      maxWidth: 320,
      borderRadius: theme.borderRadius.xl,
    },
    errorIcon: {
      marginBottom: theme.spacing.lg,
      opacity: 0.8,
    },
    errorTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onErrorContainer,
      textAlign: 'center',
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    errorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onErrorContainer,
      textAlign: 'center',
      lineHeight: (theme.typography.bodyMedium.fontSize ?? 14) * 1.4,
      marginBottom: theme.spacing.lg,
      opacity: 0.8,
    },
    retryButton: {
      minWidth: 140,
    },
    // Loading
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background + 'E6',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    loadingContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    loadingText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.md,
    },
  });

export default EnhancedPastEntriesScreen;