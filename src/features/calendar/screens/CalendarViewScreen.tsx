import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { addMonths, format, isAfter, isSameMonth, startOfDay, subMonths } from 'date-fns';
import { enUS, es, tr } from 'date-fns/locale';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ErrorState from '@/shared/components/ui/ErrorState';

import {
  CalendarView,
  CustomMarkedDates,
  DayPreview,
  updateMarkedDatesWithSelection,
} from '@/features/calendar/components';
import { useEntryDatesForMonth, useGratitudeEntry } from '@/features/gratitude/hooks';
import { ScreenLayout } from '@/shared/components/layout';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import { analyticsService } from '@/services/analyticsService';
import { AppTheme } from '@/themes/types';
import { MainTabParamList, RootStackParamList } from '@/types/navigation';
import { safeErrorDisplay } from '@/utils/errorTranslation';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/hooks/useSubscription';
import { useLanguageStore } from '@/store/languageStore';

type CalendarViewScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MainTabParamList, 'PastEntriesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const EnhancedCalendarViewScreen: React.FC = React.memo(() => {
  const navigation = useNavigation<CalendarViewScreenNavigationProp>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const { checkGate } = useSubscription();

  const animations = useCoordinatedAnimations();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const analyticsTrackedRef = useRef(false);
  const lastMonthAnalyticsRef = useRef<string>('');

  const {
    data: entryDates = [],
    isLoading: isLoadingDates,
    error: datesError,
    refetch: refetchDates,
    isRefetching,
  } = useEntryDatesForMonth(currentMonth.getFullYear(), currentMonth.getMonth() + 1);

  const {
    data: selectedEntry,
    isLoading: isLoadingEntry,
    error: entryError,
  } = useGratitudeEntry(selectedDate || '');

  useEffect(() => {
    animations.animateEntrance({ duration: 500 });
  }, [animations]);

  // Handle Month Navigation locally
  const handlePreviousMonth = useCallback(() => {
    const prev = subMonths(currentMonth, 1);
    setCurrentMonth(prev);
    setSelectedDate(null);
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    setSelectedDate(null);
  }, [currentMonth]);

  // Analytics Effects
  useEffect(() => {
    const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}`;
    if (!analyticsTrackedRef.current) {
      analyticsService.logScreenView('calendar_screen');
      analyticsTrackedRef.current = true;
    }
    if (lastMonthAnalyticsRef.current !== monthKey && entryDates.length >= 0) {
      analyticsService.logEvent('calendar_screen_viewed', {
        current_year: currentMonth.getFullYear(),
        current_month: currentMonth.getMonth() + 1,
        total_entry_dates: entryDates.length,
      });
      lastMonthAnalyticsRef.current = monthKey;
    }
  }, [currentMonth, entryDates]);

  const markedDates = useMemo<CustomMarkedDates>(() => {
    if (!Array.isArray(entryDates)) {
      return {};
    }

    const newMarkedDates: CustomMarkedDates = {};
    [...entryDates].sort().forEach((entryDate: string) => {
      newMarkedDates[entryDate] = {
        marked: true,
        dotColor: theme.colors.primary,
        activeOpacity: 0.8,
      };
    });

    if (!selectedDate) {
      return newMarkedDates;
    }

    return updateMarkedDatesWithSelection(
      newMarkedDates,
      selectedDate,
      theme.colors.primary,
      theme.colors.onPrimary,
      theme.colors.primary
    );
  }, [entryDates, selectedDate, theme.colors.onPrimary, theme.colors.primary]);

  const handleMonthChange = useCallback((dateData: DateData) => {
    const newMonthDate = new Date(dateData.timestamp);
    // synchronize local state if updated from calendar internal (though we disabled swipe)
    setCurrentMonth(newMonthDate);
    setSelectedDate(null);
  }, []);

  const handleDayPress = useCallback((day: DateData): void => {
    const newSelectedDate = day.dateString;
    setSelectedDate(newSelectedDate);
    analyticsService.logEvent('calendar_day_selected', { date: newSelectedDate });
  }, []);

  const handleAddNewEntry = useCallback((): void => {
    if (!checkGate('past_entries')) {
      return;
    }
    if (selectedDate) {
      navigation.navigate('PastEntryCreation', { date: selectedDate });
    }
  }, [selectedDate, checkGate, navigation]);

  const handleViewEntry = useCallback((): void => {
    if (selectedEntry) {
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

  const getDateLocale = () => {
    switch (language) {
      case 'tr':
        return tr;
      case 'es':
        return es;
      default:
        return enUS;
    }
  };

  const monthYearDisplay = format(currentMonth, 'MMMM yyyy', { locale: getDateLocale() });

  if (datesError) {
    return (
      <ScreenLayout>
        <ErrorState
          error={datesError}
          title={t('calendar.errors.dataLoadFailed')}
          onRetry={refetchDates}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      scrollable={true}
      edges={['top']}
      density="comfortable"
      edgeToEdge={true}
      showsVerticalScrollIndicator={false}
      keyboardAware={false}
      backgroundColor={theme.colors.background}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchDates} />}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        {/* NEW HEADER SECTION */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerLabel}>{t('calendar.title', 'YOUR JOURNEY')}</Text>
            <Text style={styles.headerTitle}>{monthYearDisplay}</Text>
            <Text style={styles.headerSubtitle}>
              {t('calendar.subtitle', 'Map your moments of gratitude.')}
            </Text>
          </View>
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={handlePreviousMonth}
              style={styles.navButton}
              disabled={isLoadingDates}
              accessibilityRole="button"
              accessibilityLabel={t('calendar.previousMonth')}
            >
              <Icon name="chevron-left" size={28} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navButton, isFutureMonth && styles.navButtonDisabled]}
              disabled={isFutureMonth || isLoadingDates}
              accessibilityRole="button"
              accessibilityLabel={t('calendar.nextMonth')}
            >
              <Icon
                name="chevron-right"
                size={28}
                color={isFutureMonth ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <CalendarView
            currentMonth={currentMonth}
            markedDates={markedDates}
            onMonthChange={handleMonthChange}
            onDayPress={handleDayPress}
            isLoading={isLoadingDates}
            isFutureMonth={isFutureMonth}
            hideHeader={true} // HIDING DEFAULT HEADER
            key={language}
          />
        </View>

        <DayPreview
          selectedDate={selectedDate}
          selectedEntry={selectedEntry ?? null}
          isLoading={isLoading}
          error={entryError ? safeErrorDisplay(entryError) : null}
          onViewEntry={handleViewEntry}
          onAddEntry={handleAddNewEntry}
        />
      </Animated.View>
    </ScreenLayout>
  );
});

EnhancedCalendarViewScreen.displayName = 'EnhancedCalendarViewScreen';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
    },
    headerContent: {
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    headerLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    headerTitle: {
      ...theme.typography.displaySmall,
      color: theme.colors.onBackground,
      fontWeight: '700',
      marginBottom: 4,
      fontFamily: 'Lora-Bold',
    },
    headerSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 22,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: 8,
    },
    navButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surfaceVariant + '40',
      justifyContent: 'center',
      alignItems: 'center',
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    calendarCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg, // Make it a card
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      paddingVertical: theme.spacing.sm, // Add internal padding
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      ...getPrimaryShadow.card(theme),
      overflow: 'hidden',
    },
  });

export default EnhancedCalendarViewScreen;
