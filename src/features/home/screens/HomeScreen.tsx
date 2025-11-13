import ActionCards from '../components/ActionCards';
import InspirationCard from '../components/InspirationCard';
import HomeHeader from '../components/HomeHeader';
import StreakDetailsScreen from '@/features/streak/screens/StreakDetailsScreen';
import { useGratitudeEntry, useRandomGratitudeEntry } from '@/features/gratitude/hooks';
import { useStreakData } from '@/features/streak/hooks';
import { useUserProfile } from '@/shared/hooks';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { analyticsService } from '@/services/analyticsService';
import type { MainTabParamList, RootStackParamList } from '@/types/navigation';
import { ScreenLayout } from '@/shared/components/layout';
import StatsRow from '@/features/home/components/StatsRow';
import HomeGratitudeListItem from '@/features/home/components/HomeGratitudeListItem';
import FloatingAddButton from '@/features/home/components/FloatingAddButton';
import ThrowbackTeaser from '@/features/throwback/components/ThrowbackTeaser';
import { safeErrorDisplay } from '@/utils/errorTranslation';
import ThemedCard from '@/shared/components/ui/ThemedCard';
// debug logger removed (noisy)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
// StatementEditCard and inline today item are no longer used in the FlatList refactor
import type { MoodEmoji } from '@/types/mood.types';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>['navigation'],
  StackNavigationProp<RootStackParamList>
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const MAX_VISIBLE_HOME_STATEMENTS = 5;

const EnhancedHomeScreen: React.FC<HomeScreenProps> = React.memo(({ navigation }) => {
  const { theme } = useTheme();
  const { handleMutationError } = useGlobalError();
  const { t } = useTranslation();

  // **COORDINATED ANIMATION**: Add minimal entrance animation for consistency
  const animations = useCoordinatedAnimations();

  // TanStack Query hooks replacing Zustand stores
  const { profile, uploadAvatar, deleteAvatar, getSizedAvatarUrl, refetchProfile } =
    useUserProfile();
  const { data: streak, refetch: refetchStreak } = useStreakData();
  const todayDateString = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: todaysEntry, refetch: refetchEntry } = useGratitudeEntry(todayDateString);

  // Throwback data for memories section
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

  // Home today list: newest -> oldest for display
  const todaysStatements = useMemo(() => todaysEntry?.statements ?? [], [todaysEntry?.statements]);
  const todaysStatementsReversed = useMemo(() => {
    return [...todaysStatements].reverse();
  }, [todaysStatements]);
  const visibleStatements = useMemo(() => {
    return todaysStatementsReversed.slice(0, MAX_VISIBLE_HOME_STATEMENTS);
  }, [todaysStatementsReversed]);
  const remainingStatementsCount = useMemo(() => {
    return Math.max(todaysStatementsReversed.length - MAX_VISIBLE_HOME_STATEMENTS, 0);
  }, [todaysStatementsReversed]);
  const shouldShowViewMore = remainingStatementsCount > 0;

  const [refreshing, setRefreshing] = useState(false);
  const [streakDetailsVisible, setStreakDetailsVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // **MINIMAL ENTRANCE**: Simple screen entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // Resolve sized signed avatar URL when profile changes
  useEffect(() => {
    let isMounted = true;
    const run = async (): Promise<void> => {
      const url = await getSizedAvatarUrl({ path: profile?.avatar_path ?? null, size: 64 });
      if (isMounted) {
        setAvatarUrl(url);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [getSizedAvatarUrl, profile?.avatar_path]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return t('home.greeting.morning');
    }
    if (hour >= 12 && hour < 17) {
      return t('home.greeting.afternoon');
    }
    if (hour >= 17 && hour < 22) {
      return t('home.greeting.evening');
    }
    return t('home.greeting.night');
  }, [t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    analyticsService.logEvent('pull_to_refresh_home');
    try {
      // TanStack Query handles refetching automatically
      await Promise.all([refetchEntry(), refetchStreak(), refetchThrowback()]);
    } catch (error) {
      handleMutationError(error, t('home.errors.refreshError'));
    } finally {
      setRefreshing(false);
    }
  }, [refetchEntry, refetchStreak, refetchThrowback, handleMutationError, t]);

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

  const handleViewMorePress = useCallback(() => {
    analyticsService.logEvent('home_view_more_tapped', {
      remainingStatements: remainingStatementsCount,
    });
    navigation.navigate('PastEntriesTab');
  }, [navigation, remainingStatementsCount]);

  const handleStreakPress = useCallback(() => {
    analyticsService.logEvent('streak_showcase_pressed');
    setStreakDetailsVisible(true);
  }, []);

  const handleMoodAnalysisPress = useCallback(() => {
    analyticsService.logEvent('navigate_to_mood_analysis', {
      source: 'home_footer_card',
    });
    navigation.getParent<StackNavigationProp<RootStackParamList>>()?.navigate('MoodAnalysis');
  }, [navigation]);

  // Dynamic image picking without compile-time dependency
  const pickImageAndUpload = useCallback(async () => {
    type ImagePickerLike = {
      requestMediaLibraryPermissionsAsync: () => Promise<{ status: 'granted' | 'denied' }>;
      launchImageLibraryAsync: (options: {
        mediaTypes?: unknown;
        allowsEditing?: boolean;
        aspect?: [number, number];
        quality?: number;
      }) => Promise<{ canceled: boolean; assets?: Array<{ uri: string }> }>;
      MediaTypeOptions: { Images: unknown };
    };

    try {
      const moduleName = 'expo-image-picker';
      const imagePicker: ImagePickerLike = (await import(moduleName)) as unknown as ImagePickerLike;
      const perm = await imagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          t('shared.media.permissions.photos.title'),
          t('shared.media.permissions.photos.message')
        );
        return;
      }
      const result = await imagePicker.launchImageLibraryAsync({
        mediaTypes: imagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const uri = result.assets[0].uri;
      await uploadAvatar(uri);
      const url = await getSizedAvatarUrl({ path: profile?.avatar_path ?? null, size: 64 });
      setAvatarUrl(url);
      await refetchProfile();
    } catch {
      Alert.alert(
        t('shared.media.imagePicker.missingTitle'),
        t('shared.media.imagePicker.missingMessage')
      );
    }
  }, [getSizedAvatarUrl, profile?.avatar_path, refetchProfile, uploadAvatar, t]);

  const handleAvatarPress = useCallback(() => {
    const showAndroid = () => {
      Alert.alert(t('shared.profile.avatar.title'), undefined, [
        { text: t('shared.media.actions.choosePhoto'), onPress: () => void pickImageAndUpload() },
        {
          text: t('shared.media.actions.removePhoto'),
          style: 'destructive',
          onPress: async () => {
            await deleteAvatar(profile?.avatar_path ?? null);
            setAvatarUrl(null);
            await refetchProfile();
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    };

    const showIOS = () => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('shared.media.actions.choosePhoto'),
            t('shared.media.actions.removePhoto'),
            t('common.cancel'),
          ],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          userInterfaceStyle: 'dark',
        },
        async (index) => {
          if (index === 0) {
            await pickImageAndUpload();
          } else if (index === 1) {
            await deleteAvatar(profile?.avatar_path ?? null);
            setAvatarUrl(null);
            await refetchProfile();
          }
        }
      );
    };

    if (Platform.OS === 'ios') {
      showIOS();
    } else {
      showAndroid();
    }
  }, [deleteAvatar, pickImageAndUpload, profile?.avatar_path, refetchProfile, t]);

  // Memoize throwback entry prop and translate errors
  const memoizedThrowbackEntry = useMemo(() => {
    return throwbackEntry
      ? {
          statements: throwbackEntry.statements || [],
          entry_date: throwbackEntry.entry_date || new Date().toISOString().split('T')[0],
        }
      : null;
  }, [throwbackEntry]);

  const translatedThrowbackError = useMemo(() => {
    return throwbackError ? safeErrorDisplay(throwbackError) : null;
  }, [throwbackError]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const header = (
    <>
      <View style={styles.section}>
        <HomeHeader
          greeting={getGreeting()}
          username={username}
          currentCount={todaysGratitudeCount}
          dailyGoal={dailyGoal}
          currentStreak={streak?.current_streak ?? 0}
          onStreakPress={handleStreakPress}
          avatarUrl={avatarUrl}
          onAvatarPress={handleAvatarPress}
        />
      </View>
      <View style={styles.section}>
        <StatsRow
          currentCount={todaysGratitudeCount}
          dailyGoal={dailyGoal}
          currentStreak={streak?.current_streak ?? 0}
          longestStreak={streak?.longest_streak ?? 0}
          onProgressPress={() => navigation.navigate('PastEntriesTab')}
          onStreakPress={handleStreakPress}
        />
      </View>
      <View style={styles.todayHeaderRow}>
        <Text style={styles.todayHeaderText}>{t('gratitude.sections.todaysEntries')}</Text>
        <View style={styles.todayCountPill}>
          <Text style={styles.todayCountText}>{todaysEntry?.statements?.length ?? 0}</Text>
        </View>
      </View>
    </>
  );

  const listData = visibleStatements;

  return (
    <>
      <ScreenLayout
        scrollable={false}
        edges={['top']}
        edgeToEdge={true}
        backgroundColor={theme.colors.surface}
      >
        <Animated.FlatList
          data={listData}
          keyExtractor={(item, index) => `${index}-${item.slice(0, 20)}`}
          renderItem={({ item, index }) => {
            const rawIndex = Math.max(todaysStatements.length - 1 - index, 0);
            const mood =
              ((todaysEntry?.moods as Record<string, string> | undefined)?.[String(rawIndex)] as
                | MoodEmoji
                | undefined) ?? null;
            return (
              <View style={styles.todayItemWrapper}>
                <HomeGratitudeListItem
                  statement={item}
                  moodEmoji={mood}
                  onPress={() => navigation.navigate('EntryDetail', { entryDate: todayDateString })}
                />
              </View>
            );
          }}
          ListHeaderComponent={header}
          ListFooterComponent={
            <>
              {shouldShowViewMore ? (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={handleViewMorePress}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.todayList.viewMoreA11y', {
                      count: remainingStatementsCount,
                    })}
                  >
                    <Text style={styles.viewAllText}>
                      {t('home.todayList.viewMore', { count: remainingStatementsCount })}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.section}>
                <ActionCards
                  currentCount={todaysGratitudeCount}
                  dailyGoal={dailyGoal}
                  onNavigateToEntry={handleNewEntryPress}
                  onNavigateToPastEntries={() => navigation.navigate('PastEntriesTab')}
                  onNavigateToCalendar={() => navigation.navigate('CalendarTab')}
                  onNavigateToWhyGratitude={() => navigation.getParent()?.navigate('WhyGratitude')}
                />
              </View>
              <View style={styles.section}>
                <ThemedCard
                  variant="elevated"
                  density="comfortable"
                  elevation="card"
                  onPress={handleMoodAnalysisPress}
                >
                  <View style={styles.moodCardContent}>
                    <View style={styles.moodIconContainer}>
                      <Icon name="emoticon-happy-outline" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.moodTextContainer}>
                      <Text style={styles.moodCardTitle}>{t('home.actions.mood.title')}</Text>
                      <Text style={styles.moodCardSubtitle}>{t('home.actions.mood.subtitle')}</Text>
                    </View>
                    <View style={styles.moodChevronContainer}>
                      <Icon name="chevron-right" size={24} color={theme.colors.primary} />
                    </View>
                  </View>
                </ThemedCard>
              </View>
              <View style={styles.section}>
                <InspirationCard currentCount={todaysGratitudeCount} dailyGoal={dailyGoal} />
              </View>
              <View style={styles.section}>
                <ThrowbackTeaser
                  throwbackEntry={memoizedThrowbackEntry}
                  isLoading={throwbackLoading}
                  error={translatedThrowbackError}
                  onRefresh={handleThrowbackRefresh}
                />
              </View>
              <View style={styles.footerSpacer} />
            </>
          }
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
          removeClippedSubviews
          initialNumToRender={8}
          windowSize={5}
          getItemLayout={(_, index) => ({ length: 120, offset: 120 * index, index })}
          contentContainerStyle={styles.listContent}
        />
      </ScreenLayout>
      <FloatingAddButton onPress={handleNewEntryPress} />

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
    sectionPadded: {
      marginBottom: theme.spacing.sm,
    },
    todayHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    todayHeaderText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    todayCountPill: {
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '25',
    },
    todayCountText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
    },
    todayListContainer: {
      paddingHorizontal: theme.spacing.sm,
    },
    todayItemWrapper: {
      marginBottom: 4,
    },
    listContent: {
      paddingHorizontal: theme.spacing.content,
    },
    footerSpacer: {
      height: theme.spacing.lg,
    },
    viewAllButton: {
      alignSelf: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      marginTop: theme.spacing.xs,
    },
    viewAllText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    moodCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    moodIconContainer: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryContainer,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '25',
    },
    moodTextContainer: {
      flex: 1,
    },
    moodCardTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    moodCardSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs / 2,
    },
    moodChevronContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceVariant,
    },
  });
