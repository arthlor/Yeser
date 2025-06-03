import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import ActionCards from '@/components/home-screen/ActionCards';
import DiscoverySection from '@/components/home-screen/DiscoverySection';
import HeroSection from '@/components/home-screen/HeroSection';
import useStreak from '@/hooks/useStreak';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { useGratitudeStore, type GratitudeStoreState } from '@/store/gratitudeStore';
import { useProfileStore } from '@/store/profileStore';
import { AppTheme } from '@/themes/types';

import type { RootStackParamList, MainAppTabParamList } from '@/types/navigation';

// Import individual components

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabScreenProps<MainAppTabParamList, 'HomeTab'>['navigation'],
  StackNavigationProp<RootStackParamList>
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const createStyles = (theme: AppTheme, insets: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
  });

const EnhancedHomeScreen: React.FC<HomeScreenProps> = React.memo(({ navigation }) => {
  const { theme, colorMode } = useTheme();
  const insets = useSafeAreaInsets();

  const { streak, isLoading: streakDataLoading, refreshStreak } = useStreak();
  const username = useProfileStore((state) => state.username);
  const dailyGratitudeGoalFromStore = useProfileStore((state) => state.daily_gratitude_goal);
  const dailyGoal = dailyGratitudeGoalFromStore ?? 3;

  const {
    entries: gratitudeEntries,
    fetchEntry,
    addStatement,
  } = useGratitudeStore(
    useShallow((state: GratitudeStoreState) => ({
      entries: state.entries,
      fetchEntry: state.fetchEntry,
      addStatement: state.addStatement,
    }))
  );

  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayDateString = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaysEntry = useMemo(
    () => gratitudeEntries[todayDateString],
    [gratitudeEntries, todayDateString]
  );
  const todaysGratitudeCount = useMemo(() => todaysEntry?.statements?.length || 0, [todaysEntry]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Günaydın';
    if (hour >= 12 && hour < 17) return 'Tünaydın';
    if (hour >= 17 && hour < 22) return 'İyi akşamlar';
    return 'İyi geceler';
  }, []);

  const fetchTodaysSummary = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await fetchEntry(today);
    } catch (error) {
      console.error('Error fetching today summary:', error);
    }
  }, [fetchEntry]);

  const handleQuickAddGratitude = useCallback(
    async (statement: string) => {
      if (!statement.trim()) {
        Alert.alert('Boş İfade', 'Lütfen minnet ifadenizi yazın.');
        return;
      }

      setQuickAddLoading(true);
      analyticsService.logEvent('quick_add_gratitude_submit');

      try {
        await addStatement(todayDateString, statement);
        await fetchTodaysSummary();
        await refreshStreak();

        // Show success feedback
        Alert.alert('Başarılı! 🎉', 'Minnet ifadeniz başarıyla eklendi.');
      } catch (error) {
        console.error('Error adding gratitude via quick add:', error);
        Alert.alert('Hata', 'Minnet ifadesi eklenirken bir sorun oluştu.');
      } finally {
        setQuickAddLoading(false);
      }
    },
    [addStatement, fetchTodaysSummary, refreshStreak, todayDateString]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    analyticsService.logEvent('pull_to_refresh_home');
    try {
      await Promise.all([fetchTodaysSummary(), refreshStreak()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchTodaysSummary, refreshStreak]);

  useEffect(() => {
    analyticsService.logScreenView('EnhancedHomeScreen');
    fetchTodaysSummary();
    refreshStreak();
  }, [fetchTodaysSummary, refreshStreak]);

  const handleNavigateToThrowback = useCallback(
    (entry: { entry_date: string }) => {
      analyticsService.logEvent('navigate_to_throwback_entry', { source: 'home_teaser' });
      navigation.navigate('DailyEntryTab', { initialDate: entry.entry_date });
    },
    [navigation]
  );

  const handleNewEntryPress = useCallback(() => {
    analyticsService.logEvent('navigate_to_new_entry', { source: 'home_main_cta' });
    navigation.navigate('DailyEntryTab', { initialDate: todayDateString });
  }, [navigation, todayDateString]);

  const handleStreakPress = useCallback(() => {
    analyticsService.logEvent('streak_showcase_pressed');
    // Navigate to streak details or past entries
    navigation.navigate('PastEntriesTab');
  }, [navigation]);

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={colorMode === 'dark' ? 'light-content' : 'dark-content'}
        translucent={false}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
        {/* Enhanced Hero Section with Prominent Streak - Top 50% */}
        <HeroSection
          greeting={getGreeting()}
          username={username}
          currentCount={todaysGratitudeCount}
          dailyGoal={dailyGoal}
          currentStreak={streak?.current_streak ?? 0}
          longestStreak={streak?.longest_streak}
          streakLoading={streakDataLoading}
          onQuickAdd={handleQuickAddGratitude}
          onStreakPress={handleStreakPress}
          isLoading={quickAddLoading}
        />

        {/* Action Cards Section - Middle 30% */}
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

        {/* Discovery Section - Bottom 20% */}
        <DiscoverySection
          currentCount={todaysGratitudeCount}
          dailyGoal={dailyGoal}
          onNavigateToThrowback={handleNavigateToThrowback}
        />
      </ScrollView>
    </View>
  );
});

EnhancedHomeScreen.displayName = 'EnhancedHomeScreen';

export default EnhancedHomeScreen;
