import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isAfter, isSameMonth, startOfDay } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ErrorState from '@/shared/components/ui/ErrorState';

import {
  CalendarStats,
  CalendarView,
  CustomMarkedDates,
  DayPreview,
  updateMarkedDatesWithSelection,
} from '@/components/calendar';
import { useEntryDatesForMonth, useGratitudeEntry } from '@/features/gratitude/hooks';
import { ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import { analyticsService } from '@/services/analyticsService';
import { AppTheme } from '@/themes/types';
import { MainTabParamList, RootStackParamList } from '@/types/navigation';
import { safeErrorDisplay } from '@/utils/errorTranslation';

type CalendarViewScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'PastEntriesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const EnhancedCalendarViewScreen: React.FC = React.memo(() => {
  const navigation = useNavigation<CalendarViewScreenNavigationProp>();
  const { theme } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const colorsRef = useRef({
    primary: theme.colors.primary,
    onPrimary: theme.colors.onPrimary,
  });

  useEffect(() => {
    colorsRef.current = {
      primary: theme.colors.primary,
      onPrimary: theme.colors.onPrimary,
    };
  }, [theme.colors.primary, theme.colors.onPrimary]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<CustomMarkedDates>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const analyticsTrackedRef = useRef(false);
  const lastMonthAnalyticsRef = useRef<string>('');
  const lastProcessedEntryDatesRef = useRef<string>('');

  const {
    data: entryDates = [],
    isLoading: isLoadingDates,
    error: datesError,
    refetch: refetchDates,
  } = useEntryDatesForMonth(currentMonth.getFullYear(), currentMonth.getMonth() + 1);

  const {
    data: selectedEntry,
    isLoading: isLoadingEntry,
    error: entryError,
  } = useGratitudeEntry(selectedDate || '');

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (!analyticsTrackedRef.current) {
      analyticsService.logScreenView('calendar_screen');
      analyticsTrackedRef.current = true;
    }

    const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}`;
    if (lastMonthAnalyticsRef.current !== monthKey && entryDates.length >= 0) {
      analyticsService.logEvent('calendar_screen_viewed', {
        current_year: currentMonth.getFullYear(),
        current_month: currentMonth.getMonth() + 1,
        total_entry_dates: entryDates.length,
        has_selected_date: !!selectedDate,
        selected_date: selectedDate || null,
        has_entry_for_selected: !!selectedEntry,
      });
      lastMonthAnalyticsRef.current = monthKey;
    }
  }, [currentMonth, entryDates.length, selectedDate, selectedEntry]);

  useEffect(() => {
    if (!Array.isArray(entryDates)) {
      return;
    }

    const entryDatesString = JSON.stringify(entryDates.sort());
    const currentKey = `${entryDatesString}-${selectedDate}-${currentMonth.getTime()}`;

    if (lastProcessedEntryDatesRef.current === currentKey) {
      return;
    }

    lastProcessedEntryDatesRef.current = currentKey;

    const newMarkedDates: CustomMarkedDates = {};

    entryDates.forEach((entryDate: string) => {
      newMarkedDates[entryDate] = {
        marked: true,
        dotColor: colorsRef.current.primary,
        activeOpacity: 0.8,
      };
    });

    setMarkedDates(() => {
      if (selectedDate) {
        return updateMarkedDatesWithSelection(
          newMarkedDates,
          selectedDate,
          colorsRef.current.primary,
          colorsRef.current.onPrimary,
          colorsRef.current.primary
        );
      }
      return newMarkedDates;
    });

    if (entryDates.length > 0) {
      const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}`;
      if (lastMonthAnalyticsRef.current !== monthKey) {
        analyticsService.logEvent('calendar_month_viewed', {
          year: currentMonth.getFullYear(),
          month: currentMonth.getMonth() + 1,
          entry_count: entryDates.length,
        });
        lastMonthAnalyticsRef.current = monthKey;
      }
    }
  }, [entryDates, selectedDate, currentMonth]);

  const handleMonthChange = useCallback((dateData: DateData) => {
    const newMonthDate = new Date(dateData.timestamp);
    setCurrentMonth(newMonthDate);
    setSelectedDate(null);

    analyticsService.logEvent('calendar_month_changed', {
      year: newMonthDate.getFullYear(),
      month: newMonthDate.getMonth() + 1,
    });
  }, []);

  const handleDayPress = useCallback(
    (day: DateData): void => {
      const newSelectedDate = day.dateString;
      setSelectedDate(newSelectedDate);

      analyticsService.logEvent('calendar_day_selected', {
        date: newSelectedDate,
        has_entry: Boolean(selectedEntry),
      });
    },
    [selectedEntry]
  );

  const handleAddNewEntry = useCallback((): void => {
    analyticsService.logEvent('add_entry_from_calendar', {
      date: selectedDate ?? new Date().toISOString().split('T')[0],
    });

    if (selectedDate) {
      navigation.navigate('PastEntryCreation', {
        date: selectedDate,
      });
    }
  }, [navigation, selectedDate]);

  const handleViewEntry = useCallback((): void => {
    if (selectedEntry) {
      analyticsService.logEvent('view_entry_from_calendar', {
        date: selectedDate,
        entry_id: selectedEntry.id,
      });

      navigation.navigate('EntryDetail', {
        entryId: selectedEntry.id,
        entryDate: selectedDate ?? undefined,
      });
    }
  }, [navigation, selectedDate, selectedEntry]);

  const isLoading = useMemo(
    () => isLoadingDates || isLoadingEntry,
    [isLoadingDates, isLoadingEntry]
  );

  const isFutureMonth = useMemo(() => {
    const today = startOfDay(new Date());
    const current = startOfDay(currentMonth);
    return isSameMonth(today, current) || isAfter(current, today);
  }, [currentMonth]);

  // 🛡️ ERROR PROTECTION: Render a full-screen error state if the main query fails
  if (datesError) {
    return (
      <ScreenLayout>
        <ErrorState error={datesError} title="Takvim Verileri Yüklenemedi" onRetry={refetchDates} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      scrollable={true}
      edges={['top']}
      density="compact"
      edgeToEdge={true}
      showsVerticalScrollIndicator={false}
      keyboardAware={false}
      keyboardDismissMode="none"
      keyboardShouldPersistTaps="always"
    >
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <CalendarView
          currentMonth={currentMonth}
          markedDates={markedDates}
          onMonthChange={handleMonthChange}
          onDayPress={handleDayPress}
          isLoading={isLoadingDates}
          isFutureMonth={isFutureMonth}
        />

        <CalendarStats
          markedDates={markedDates}
          currentMonth={currentMonth}
          isLoading={isLoading}
        />

        <DayPreview
          selectedDate={selectedDate}
          selectedEntry={selectedEntry ?? null}
          isLoading={isLoading}
          error={entryError ? safeErrorDisplay(entryError) : null}
          onViewEntry={handleViewEntry}
          onAddEntry={handleAddNewEntry}
        />

        <View style={styles.guideCard}>
          <View style={styles.guideContent}>
            <Icon name="lightbulb-outline" size={20} color={theme.colors.secondary} />
            <Text style={styles.guideText}>
              Noktalı günler şükür notları içerir • Aylar arası geçiş için kaydırın
            </Text>
          </View>
        </View>
      </Animated.View>
    </ScreenLayout>
  );
});

EnhancedCalendarViewScreen.displayName = 'EnhancedCalendarViewScreen';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    animatedContainer: {
      flex: 1,
    },
    guideCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      marginTop: theme.spacing.md,
      ...getPrimaryShadow.card(theme),
    },
    guideContent: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    guideText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
      lineHeight: 18,
      opacity: 0.8,
    },
  });

export default EnhancedCalendarViewScreen;
