import ActionCards from '../components/ActionCards';
import DailyInspiration from '../components/DailyInspiration';
import HeroSection from '../components/HeroSection';
import ThrowbackTeaser from '@/features/throwback/components/ThrowbackTeaser';
import StreakDetailsScreen from '@/features/streak/screens/StreakDetailsScreen';
import { useGratitudeEntry, useRandomGratitudeEntry } from '@/features/gratitude/hooks';
import { useStreakData } from '@/features/streak/hooks';
import { useUserProfile } from '@/shared/hooks';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { analyticsService } from '@/services/analyticsService';
import type { MainTabParamList, RootStackParamList } from '@/types/navigation';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenLayout } from '@/shared/components/layout';
import { safeErrorDisplay } from '@/utils/errorTranslation';
// debug logger removed (noisy)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, RefreshControl, StyleSheet, View } from 'react-native';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>['navigation'],
  StackNavigationProp<RootStackParamList>
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const EnhancedHomeScreen: React.FC<HomeScreenProps> = React.memo(({ navigation }) => {
  const { theme } = useTheme();
  const { handleMutationError } = useGlobalError();

  // **COORDINATED ANIMATION**: Add minimal entrance animation for consistency
  const animations = useCoordinatedAnimations();

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

  // Removed noisy total count debug logs

  // Extract data from TanStack Query responses
  const username = profile?.username;
  const dailyGoal = profile?.daily_gratitude_goal ?? 3;
  const todaysGratitudeCount = useMemo(() => todaysEntry?.statements?.length ?? 0, [todaysEntry]);

  const [refreshing, setRefreshing] = useState(false);
  const [streakDetailsVisible, setStreakDetailsVisible] = useState(false);

  // **MINIMAL ENTRANCE**: Simple screen entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

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
      handleMutationError(error, 'sayfa yenileme');
    } finally {
      setRefreshing(false);
    }
  }, [refetchEntry, refetchStreak, refetchThrowback, handleMutationError]);

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
    navigation.getParent()?.navigate('WhyGratitude');
  }, [navigation]);

  // Memoize throwback entry prop to prevent unnecessary re-renders
  const memoizedThrowbackEntry = useMemo(() => {
    return throwbackEntry
      ? {
          statements: throwbackEntry.statements || [],
          entry_date: throwbackEntry.entry_date || new Date().toISOString().split('T')[0],
        }
      : null;
  }, [throwbackEntry]);

  // Translate throwback error using centralized utility
  const translatedThrowbackError = useMemo(() => {
    return throwbackError ? safeErrorDisplay(throwbackError) : null;
  }, [throwbackError]);

  const styles = useMemo(() => createStyles(theme), [theme]);

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
        <Animated.View style={StyleSheet.create({ fade: { opacity: animations.fadeAnim } }).fade}>
          <View style={styles.stack}>
            {/* 1. Hero Section with Streak Info */}
            <View style={styles.section}>
              <HeroSection
                greeting={getGreeting()}
                username={username}
                currentCount={todaysGratitudeCount}
                dailyGoal={dailyGoal}
                currentStreak={streak?.current_streak ?? 0}
                longestStreak={streak?.longest_streak}
                onStreakPress={handleStreakPress}
              />
            </View>

            {/* 2. Daily Inspiration - Replaces Quick Add */}
            <View style={styles.section}>
              <DailyInspiration currentCount={todaysGratitudeCount} dailyGoal={dailyGoal} />
            </View>

            {/* 3. Enhanced Action Cards */}
            <View style={styles.section}>
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
            </View>

            {/* 4. Geçmişten Anılar (Throwback Memories) */}
            <View style={styles.section}>
              <ThrowbackTeaser
                throwbackEntry={memoizedThrowbackEntry}
                isLoading={throwbackLoading}
                error={translatedThrowbackError}
                onRefresh={handleThrowbackRefresh}
              />
            </View>
          </View>
        </Animated.View>
      </ScreenLayout>

      {/* Streak Details Modal - Fixed to fullscreen on iOS */}
      <Modal
        visible={streakDetailsVisible}
        animationType="slide"
        presentationStyle="fullScreen"
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    stack: {
      gap: theme.spacing.sm,
    },
    section: {
      marginBottom: theme.spacing.sm,
    },
  });
