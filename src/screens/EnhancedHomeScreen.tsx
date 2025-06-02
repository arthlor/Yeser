import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { EnhancedStreakVisual } from '@/components';
import GratitudeInputBar from '@/components/GratitudeInputBar';
import ThemedButton from '@/components/ThemedButton';
import InspirationCard from '@/components/home-screen/InspirationCard';
import ThemedCard from '@/components/ThemedCard';
import HomeScreenHeader from '@/components/home-screen/HomeScreenHeader';
import StreakDisplay from '@/components/home-screen/StreakDisplay';
import TodaysGratitudeSummary from '@/components/home-screen/TodaysGratitudeSummary';
import ThrowbackTeaser from '@/components/home-screen/ThrowbackTeaser';
import QuickAddGratitude from '@/components/home-screen/QuickAddGratitude';
import useStreak from '@/hooks/useStreak';
import { useTheme } from '@/providers/ThemeProvider';
import { useGratitudeStore } from '@/store/gratitudeStore';
import { analyticsService } from '@/services/analyticsService';
import { useProfileStore } from '@/store/profileStore';
import { useThrowbackStore } from '@/store/throwbackStore';
import { AppTheme } from '@/themes/types';
import { MainAppTabParamList, RootStackParamList } from '@/types/navigation';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabScreenProps<MainAppTabParamList, 'HomeTab'>['navigation'],
  StackNavigationProp<RootStackParamList>
>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const createStyles = (theme: AppTheme, insets: EdgeInsets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl + 40, 
  },


  streakSection: {
  },
  streakContainer: {
    alignItems: 'center', 
    paddingHorizontal: theme.spacing.lg, 
    marginBottom: theme.spacing.lg,
  },
  actionsSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg, 
    marginBottom: theme.spacing.lg, 
  },
  primaryActionsContainer: {
    marginBottom: theme.spacing.md,
  },
  primaryButton: { 
  },
  secondaryActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    gap: theme.spacing.md, 
  },
  secondaryButton: { 
    flex: 1, 
  },
  loadingContainer: { 
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    minHeight: 150, 
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    fontWeight: '500',
  },
  errorCard: { 
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorCardContent: { 
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: 15, 
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.sm, 
    marginBottom: theme.spacing.md, 
    fontWeight: '500',
    lineHeight: 22,
  },
  loadingContainerMini: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md, // Smaller padding
    minHeight: 80, // Smaller min height
  },
  loadingTextMini: {
    ...theme.typography.bodySmall, // Smaller font
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm, // Smaller margin
  },
  appTitle: { 
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -1,
    textShadowColor: `${theme.colors.primary}20`,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleAccent: { 
    width: 40,
    height: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginTop: theme.spacing.xs,
  },
});

const EnhancedHomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme, currentThemeName } = useTheme();
  const insets = useSafeAreaInsets();

  const { streak, isLoading: streakDataLoading, error: streakDataError } = useStreak();
  const profileLoading = useProfileStore(state => state.loading);
  const profileError = useProfileStore(state => state.error);
  const fetchProfile = useProfileStore(state => state.fetchProfile); 

  const username = useProfileStore(state => state.username);
  const profileFetched = useProfileStore(state => state.id !== null && state.initialProfileFetchAttempted);
  const dailyGratitudeGoalFromStore = useProfileStore(state => state.daily_gratitude_goal);
  const dailyGoal = dailyGratitudeGoalFromStore ?? 3;

  const userId = useProfileStore(state => state.id); 

  const {
    randomEntry: throwbackEntry, 
    fetchRandomEntry,
    isLoading: throwbackLoading,
    error: throwbackErrorMsg,
  } = useThrowbackStore();

  const {
    entries: gratitudeEntries,
    isLoading: isGratitudeLoading,
    error: gratitudeErrorMsg,
    fetchEntry: fetchGratitudeEntry,
    addStatement: addGratitudeStatement,
  } = useGratitudeStore();

  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayDateString = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaysEntry = useMemo(() => gratitudeEntries[todayDateString], [gratitudeEntries, todayDateString]);
  const todaysGratitudeCount = useMemo(() => todaysEntry?.statements?.length || 0, [todaysEntry]);
  const recentStatements = useMemo(
    () => todaysEntry?.statements?.slice(-3).reverse().map((s: string) => s) || [],
    [todaysEntry?.statements]
  );

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Günaydın';
    if (hour >= 12 && hour < 17) return 'Tünaydın';
    if (hour >= 17 && hour < 22) return 'İyi akşamlar';
    return 'İyi geceler';
  }, []);

  const getMotivationalMessage = useCallback(() => {
    const messages = [
      'Bugün minnettar olduğunuz üç şey nedir?',
      'Hayatınızdaki küçük güzellikleri fark edin.',
      'Şükür kalbi besler, ruhu güçlendirir.',
      'Her gün yeni bir minnettarlık fırsatıdır.',
      'Sahip olduklarınıza odaklanın.',
    ];
    if (todaysGratitudeCount === 0) return messages[Math.floor(Math.random() * messages.length)];
    if (todaysGratitudeCount < dailyGoal) return `Harika! Hedefe ${dailyGoal - todaysGratitudeCount} şükran kaldı.`;
    return 'Hedef tamamlandı! Harikasınız! 🎉';
  }, [todaysGratitudeCount, dailyGoal]);

  const fetchTodaysSummary = useCallback(async () => {
    await fetchGratitudeEntry(todayDateString);
  }, [fetchGratitudeEntry, todayDateString]);

  const handleQuickAddGratitude = useCallback(async (statement: string) => {
    if (!statement.trim()) {
      // TODO: Show a toast or inline message for empty input
      console.log('Gratitude statement is empty');
      return;
    }
    try {
      const today = new Date();
      const todayDateStringForAdd = today.toISOString().split('T')[0];
      await addGratitudeStatement(todayDateStringForAdd, statement);
      // TODO: Show success toast
      console.log('Gratitude added successfully via quick add');
      fetchTodaysSummary(); // Use local fetchTodaysSummary
    } catch (error) {
      console.error('Error adding gratitude via quick add:', error);
      // TODO: Show error toast
    }
  }, [addGratitudeStatement, fetchTodaysSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    analyticsService.logEvent('pull_to_refresh_home');
    try {
      await Promise.all([
        fetchTodaysSummary(),
        useProfileStore.getState().refreshStreak(),
        fetchRandomEntry(),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchTodaysSummary, fetchRandomEntry]);

  useEffect(() => {
    analyticsService.logScreenView('EnhancedHomeScreen');
    fetchTodaysSummary();
    fetchRandomEntry();
    useProfileStore.getState().refreshStreak();
  }, [fetchTodaysSummary, fetchRandomEntry]);

  const handleNavigateToThrowback = () => {
    if (throwbackEntry) {
      analyticsService.logEvent('navigate_to_throwback_entry', { source: 'home_teaser' });
      navigation.navigate('DailyEntryTab', { initialDate: throwbackEntry.entry_date });
    }
  };

  const handleQuickAddStatement = async (statementText: string) => {
    if (!statementText.trim()) {
      Alert.alert('Boş İfade', 'Lütfen bir şükran ifadesi girin.');
      return;
    }
    setQuickAddLoading(true);
    analyticsService.logEvent('quick_add_gratitude');
    try {
      await addGratitudeStatement(todayDateString, statementText);
    } catch (error) {
      console.error('Failed to quick add statement:', error);
      Alert.alert('Hata', 'Minnet ifadesi eklenirken bir sorun oluştu.');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleNewEntryPress = () => {
    analyticsService.logEvent('navigate_to_new_entry', { source: 'home_main_cta' });
    navigation.navigate('DailyEntryTab', { initialDate: todayDateString });
  };

  const handleMilestoneReached = (milestoneParam: any) => {
    const currentMilestone = typeof milestoneParam === 'object' && milestoneParam !== null && 'count' in milestoneParam && typeof milestoneParam.count === 'number' 
      ? milestoneParam.count 
      : typeof milestoneParam === 'number' 
      ? milestoneParam 
      : streak?.current_streak ?? 0;
    analyticsService.logEvent('streak_milestone_reached', { milestone: currentMilestone });
    Alert.alert(
      'Tebrikler! 🎉',
      `${currentMilestone} günlük seriye ulaştınız! Harika gidiyorsunuz!`
    );
  };
  
  const headerHeight = 60; 
  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={currentThemeName === 'dark' ? 'light-content' : 'dark-content'}
        translucent={false}
      />

      <HomeScreenHeader 
        greeting={getGreeting()} 
        username={username} 
        onNavigateToSettings={() => navigation.navigate('SettingsTab')}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView
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
          <ThrowbackTeaser 
            throwbackEntry={throwbackEntry}
            isLoading={throwbackLoading}
            error={throwbackErrorMsg}
            onNavigateToThrowback={handleNavigateToThrowback}
          />

          <InspirationCard 
            title="Günlük İlham"
            message={getMotivationalMessage()}
          />

          <QuickAddGratitude onSubmit={handleQuickAddGratitude} />

          <TodaysGratitudeSummary 
            todaysGratitudeCount={todaysGratitudeCount}
            recentStatements={recentStatements}
            navigation={navigation}
            isLoading={isGratitudeLoading && !todaysEntry && !gratitudeErrorMsg} // Show loading only if no data/error yet
            error={gratitudeErrorMsg && !todaysEntry ? gratitudeErrorMsg : null} // Show error only if no data
            onRetryFetch={fetchTodaysSummary}
          />

          <StreakDisplay 
            currentStreak={streak?.current_streak ?? 0}
            isLoading={streakDataLoading}
            error={streakDataError ? 'Seri bilgileri yüklenemedi.' : null}
            onMilestoneReached={handleMilestoneReached}
          />

          <View style={styles.actionsSection}>
            <View style={styles.primaryActionsContainer}>
              <ThemedButton
                title="Yeni Günlük Giriş Ekle"
                onPress={handleNewEntryPress}
                variant="primary"
                style={styles.primaryButton}
              />
            </View>
            <View style={styles.secondaryActionsContainer}>
              <ThemedButton
                title="Tümünü İncele"
                onPress={() => navigation.navigate('PastEntriesTab')}
                variant="secondary"
                style={styles.secondaryButton}
              />
              <ThemedButton
                title="Ayarlar"
                onPress={() => navigation.navigate('SettingsTab')}
                variant="ghost"
                style={styles.secondaryButton}
              />
            </View>
          </View>

          <View style={{ height: insets.bottom + theme.spacing.xl }} />

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default EnhancedHomeScreen;
