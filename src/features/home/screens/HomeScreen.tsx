import ActionCards from '../components/ActionCards';
import DailyInspiration from '../components/DailyInspiration';
import HeroSection from '../components/HeroSection';
import ThrowbackTeaser from '@/features/throwback/components/ThrowbackTeaser';
import StreakDetailsScreen from '@/features/streak/screens/StreakDetailsScreen';
import { useGratitudeEntry, useGratitudeTotalCount, useRandomGratitudeEntry } from '@/features/gratitude/hooks';
import { useStreakData } from '@/features/streak/hooks';
import { useUserProfile } from '@/shared/hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import type { MainAppTabParamList, RootStackParamList } from '@/types/navigation';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenLayout } from '@/shared/components/layout';
import { StatementCard } from '@/shared/components/ui';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getPrimaryShadow } from '@/themes/utils';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { logger } from '@/utils/debugConfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabScreenProps<MainAppTabParamList, 'HomeTab'>['navigation'],
  StackNavigationProp<RootStackParamList>
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const EnhancedHomeScreen: React.FC<HomeScreenProps> = React.memo(({ navigation }) => {
  const { theme } = useTheme();

  // TanStack Query hooks replacing Zustand stores
  const { profile } = useUserProfile();
  const { data: streak, isLoading: streakDataLoading, refetch: refetchStreak } = useStreakData();
  const todayDateString = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: todaysEntry, refetch: refetchEntry } = useGratitudeEntry(todayDateString);

  // Throwback data for Geçmişten Anılar
  const {
    data: throwbackEntry,
    isLoading: throwbackLoading,
    error: throwbackError,
    refetch: refetchThrowback,
  } = useRandomGratitudeEntry();

  // Debug: Check total gratitude entries count
  const { data: totalEntriesCount } = useGratitudeTotalCount();
  
  React.useEffect(() => {
    logger.debug('HomeScreen Debug - Total gratitude entries:', totalEntriesCount);
  }, [totalEntriesCount]);

  // Extract data from TanStack Query responses
  const username = profile?.username;
  const dailyGoal = profile?.daily_gratitude_goal ?? 3;
  const todaysGratitudeCount = useMemo(() => todaysEntry?.statements?.length ?? 0, [todaysEntry]);

  const [refreshing, setRefreshing] = useState(false);
  const [streakDetailsVisible, setStreakDetailsVisible] = useState(false);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {return 'Günaydın';}
    if (hour >= 12 && hour < 17) {return 'Tünaydın';}
    if (hour >= 17 && hour < 22) {return 'İyi akşamlar';}
    return 'İyi geceler';
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    analyticsService.logEvent('pull_to_refresh_home');
    try {
      // TanStack Query handles refetching automatically
      await Promise.all([refetchEntry(), refetchStreak(), refetchThrowback()]);
    } catch (error) {
      logger.error('Refresh error:', error as Error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEntry, refetchStreak, refetchThrowback]);

  useEffect(() => {
    analyticsService.logScreenView('EnhancedHomeScreen');
    // TanStack Query automatically fetches data when component mounts
  }, []);

  const handleThrowbackRefresh = useCallback(() => {
    analyticsService.logEvent('throwback_refresh_tapped');
    refetchThrowback();
  }, [refetchThrowback]);

  const handleNewEntryPress = useCallback(() => {
    analyticsService.logEvent('navigate_to_new_entry', { source: 'home_main_cta' });
    navigation.navigate('DailyEntryTab', { initialDate: todayDateString });
  }, [navigation, todayDateString]);

  const handleStreakPress = useCallback(() => {
    analyticsService.logEvent('streak_showcase_pressed');
    setStreakDetailsVisible(true);
  }, []);

  // Today's Featured Statements Component
  const TodaysFeaturedStatements = useCallback(() => {
    const styles = createStyles(theme);
    
    if (!todaysEntry?.statements || todaysEntry.statements.length === 0) {
      return null;
    }

    const featuredStatement = todaysEntry.statements[0]; // Show first statement as featured
    const hasMore = todaysEntry.statements.length > 1;

    return (
      <View style={styles.featuredContainer}>
        <ThemedCard 
          variant="elevated" 
          density="comfortable"
          elevation="card"
          style={styles.featuredCard}
        >
          <View style={styles.featuredHeader}>
            <View style={styles.featuredHeaderLeft}>
              <Icon name="star-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.featuredTitle}>Bugünkü Öne Çıkan Şükran</Text>
            </View>
            <TouchableOpacity
              onPress={handleNewEntryPress}
              style={styles.featuredAction}
              activeOpacity={0.7}
            >
              <Icon name="plus-circle" size={16} color={theme.colors.primary} />
              <Text style={styles.featuredActionText}>Daha Fazla</Text>
            </TouchableOpacity>
          </View>

          {/* 🚀 ENHANCED Featured Statement with Interactive Features */}
          <StatementCard
            statement={featuredStatement}
            variant="default"
            showQuotes={true}
            animateEntrance={true}
            numberOfLines={3}
            onPress={handleNewEntryPress}
            
            // ✨ NEW: Enhanced Interactive Features for Featured Display - Simplified
            enableSwipeActions={false} // Disabled per user preference
            enableLongPress={false} // Simplified interaction
            enableInlineEdit={false} // Disable for home screen
            enableQuickActions={false} // Disable for home screen
            
            // ✨ NEW: Accessibility & Feedback
            accessibilityLabel={`Öne çıkan şükran: ${featuredStatement}`}
            hapticFeedback={false} // Simplified feedback
            
            style={styles.featuredStatementCard}
          />

          {hasMore && (
            <View style={styles.featuredFooter}>
              <Icon name="heart-multiple" size={14} color={theme.colors.primary} />
              <Text style={styles.featuredFooterText}>
                +{todaysEntry.statements.length - 1} şükran daha
              </Text>
            </View>
          )}
        </ThemedCard>
      </View>
    );
  }, [todaysEntry, theme, handleNewEntryPress]);

  const createStyles = useCallback((theme: any) => StyleSheet.create({
    featuredContainer: {
      marginBottom: theme.spacing.md,
    },
    featuredCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      ...getPrimaryShadow.card(theme),
    },
    featuredHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
      // Padding handled by density="comfortable"
    },
    featuredHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    featuredTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      marginLeft: theme.spacing.sm,
      fontWeight: '700',
    },
    featuredAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryContainer + '40',
    },
    featuredActionText: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      marginLeft: theme.spacing.xs,
      fontWeight: '600',
    },
    featuredStatementCard: {
      marginTop: 0,
      borderTopWidth: 0,
      borderRadius: 0,
    },
    featuredFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '15',
    },
    featuredFooterText: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      marginLeft: theme.spacing.xs,
      fontWeight: '600',
    },
  }), [theme]);

  return (
    <>
      <ScreenLayout
        scrollable={true}
        showsVerticalScrollIndicator={false}
        density="compact"
        edges={['top']}
        edgeToEdge={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        {/* 1. Hero Section with Streak Info */}
        <HeroSection
          greeting={getGreeting()}
          username={username}
          currentCount={todaysGratitudeCount}
          dailyGoal={dailyGoal}
          currentStreak={streak?.current_streak ?? 0}
          longestStreak={streak?.longest_streak}
          onStreakPress={handleStreakPress}
        />

        {/* 2. Daily Inspiration - Replaces Quick Add */}
        <DailyInspiration
          currentCount={todaysGratitudeCount}
          dailyGoal={dailyGoal}
        />

        {/* 2.5. Today's Featured Statements (shown when there are statements) */}
        <TodaysFeaturedStatements />

        {/* 3. Enhanced Action Cards */}
        <ActionCards
          currentCount={todaysGratitudeCount}
          dailyGoal={dailyGoal}
          onNavigateToEntry={handleNewEntryPress}
          onNavigateToPastEntries={() => {
            navigation.navigate('PastEntriesTab');
          }}
          onNavigateToCalendar={() => {
            navigation.navigate('CalendarTab');
          }}
        />

        {/* 4. Geçmişten Anılar (Throwback Memories) */}
        <ThrowbackTeaser
          throwbackEntry={throwbackEntry ? {
            statements: throwbackEntry.statements || [],
            entry_date: throwbackEntry.entry_date || new Date().toISOString().split('T')[0],
          } : null}
          isLoading={throwbackLoading}
          error={throwbackError ? throwbackError.message : null}
          onRefresh={handleThrowbackRefresh}
        />
      </ScreenLayout>

      {/* Streak Details Modal */}
      <Modal
        visible={streakDetailsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStreakDetailsVisible(false)}
      >
        <StreakDetailsScreen
          navigation={{
            goBack: () => setStreakDetailsVisible(false),
          }}
        />
      </Modal>
    </>
  );
});

EnhancedHomeScreen.displayName = 'EnhancedHomeScreen';

export default EnhancedHomeScreen;
