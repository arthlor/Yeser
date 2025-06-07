import ActionCards from '../components/ActionCards';
import DailyInspiration from '../components/DailyInspiration';
import HeroSection from '../components/HeroSection';
import ThrowbackTeaser from '@/features/throwback/components/ThrowbackTeaser';
import StreakDetailsScreen from '@/features/streak/screens/StreakDetailsScreen';
import {
  useGratitudeEntry,
  useGratitudeTotalCount,
  useRandomGratitudeEntry,
} from '@/features/gratitude/hooks';
import { useStreakData } from '@/features/streak/hooks';
import { useUserProfile } from '@/shared/hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import type { MainAppTabParamList, RootStackParamList } from '@/types/navigation';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenLayout } from '@/shared/components/layout';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, RefreshControl } from 'react-native';
import { logger } from '@/utils/debugConfig';

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
  const { data: streak, refetch: refetchStreak } = useStreakData();
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
    logger.debug('HomeScreen Debug - Total gratitude entries:', {
      totalEntriesCount,
      component: 'HomeScreen',
    });
  }, [totalEntriesCount]);

  // Extract data from TanStack Query responses
  const username = profile?.username;
  const dailyGoal = profile?.daily_gratitude_goal ?? 3;
  const todaysGratitudeCount = useMemo(() => todaysEntry?.statements?.length ?? 0, [todaysEntry]);

  const [refreshing, setRefreshing] = useState(false);
  const [streakDetailsVisible, setStreakDetailsVisible] = useState(false);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Günaydın';
    }
    if (hour >= 12 && hour < 17) {
      return 'Tünaydın';
    }
    if (hour >= 17 && hour < 22) {
      return 'İyi akşamlar';
    }
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

  const handleWhyGratitudePress = useCallback(() => {
    analyticsService.logEvent('navigate_to_why_gratitude', { source: 'home_action_cards' });
    navigation.navigate('WhyGratitude');
  }, [navigation]);

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
        <DailyInspiration currentCount={todaysGratitudeCount} dailyGoal={dailyGoal} />

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
          onNavigateToWhyGratitude={handleWhyGratitudePress}
        />

        {/* 4. Geçmişten Anılar (Throwback Memories) */}
        <ThrowbackTeaser
          throwbackEntry={
            throwbackEntry
              ? {
                  statements: throwbackEntry.statements || [],
                  entry_date: throwbackEntry.entry_date || new Date().toISOString().split('T')[0],
                }
              : null
          }
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
