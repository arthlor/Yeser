import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
import { MainAppTabParamList, RootStackParamList } from '@/types/navigation';

// Define navigation prop types
type CalendarViewScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MainAppTabParamList, 'PastEntriesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * Enhanced Calendar View Screen - Edge-to-Edge Design
 * Implements comprehensive edge-to-edge patterns with proper spacing hierarchy
 */
const EnhancedCalendarViewScreen: React.FC = () => {
  const navigation = useNavigation<CalendarViewScreenNavigationProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<CustomMarkedDates>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // TanStack Query - Replace manual API calls
  const {
    data: entryDates = [],
    isLoading: isLoadingDates,
    error: datesError,
  } = useEntryDatesForMonth(currentMonth.getFullYear(), currentMonth.getMonth() + 1);

  const {
    data: selectedEntry,
    isLoading: isLoadingEntry,
    error: entryError,
  } = useGratitudeEntry(selectedDate || '');

  // Initialize staggered animations for edge-to-edge cards
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

  // Update marked dates when entry dates change
  useEffect(() => {
    const newMarkedDates: CustomMarkedDates = {};
    entryDates.forEach((entryDate: string) => {
      newMarkedDates[entryDate] = {
        marked: true,
        dotColor: theme.colors.primary,
        activeOpacity: 0.8,
      };
    });

    // Preserve selection if exists
    if (selectedDate && newMarkedDates[selectedDate]) {
      Object.assign(
        newMarkedDates,
        updateMarkedDatesWithSelection(
          newMarkedDates,
          selectedDate,
          theme.colors.primary,
          theme.colors.onPrimary,
          theme.colors.primary
        )
      );
    }

    setMarkedDates(newMarkedDates);

    // Log analytics
    if (entryDates.length > 0) {
      analyticsService.logEvent('calendar_month_viewed', {
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1,
        entry_count: entryDates.length,
      });
    }
  }, [entryDates, selectedDate, theme.colors.primary, theme.colors.onPrimary, currentMonth]);

  // Handle month navigation
  const handleMonthChange = useCallback((dateData: DateData) => {
    const newMonthDate = new Date(dateData.timestamp);
    setCurrentMonth(newMonthDate);
    analyticsService.logEvent('calendar_month_changed', {
      year: newMonthDate.getFullYear(),
      month: newMonthDate.getMonth() + 1,
    });
  }, []);

  // Handle day selection - Now much simpler with TanStack Query
  const handleDayPress = (day: DateData): void => {
    const newSelectedDate = day.dateString;
    setSelectedDate(newSelectedDate);

    // Update marked dates with selection
    const updatedMarkedDates = updateMarkedDatesWithSelection(
      markedDates,
      newSelectedDate,
      theme.colors.primary,
      theme.colors.onPrimary,
      theme.colors.primary
    );
    setMarkedDates(updatedMarkedDates);

    analyticsService.logEvent('calendar_day_selected', {
      date: newSelectedDate,
      has_entry: Boolean(selectedEntry),
    });
  };

  // Navigation handlers
  const handleAddNewEntry = (): void => {
    analyticsService.logEvent('add_entry_from_calendar', {
      date: selectedDate ?? new Date().toISOString().split('T')[0],
    });

    navigation.navigate('DailyEntryTab', {
      initialDate: selectedDate ?? new Date().toISOString().split('T')[0],
    });
  };

  const handleViewEntry = (): void => {
    if (selectedEntry) {
      analyticsService.logEvent('view_entry_from_calendar', {
        date: selectedDate,
        entry_id: selectedEntry.id,
      });

      navigation.navigate('EntryDetail', { entryDate: selectedEntry.entry_date });
    }
  };

  // Combine loading states
  const isLoading = isLoadingDates || isLoadingEntry;

  // Combine errors
  const error = datesError?.message || entryError?.message || null;

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
        {/* Enhanced Calendar - Edge-to-Edge */}
        <CalendarView
          markedDates={markedDates}
          currentMonth={currentMonth}
          onMonthChange={handleMonthChange}
          onDayPress={handleDayPress}
          isLoading={isLoading}
        />

        {/* Statistics Cards - Edge-to-Edge */}
        <CalendarStats
          markedDates={markedDates}
          currentMonth={currentMonth}
          isLoading={isLoading}
        />

        {/* Day Preview - Edge-to-Edge */}
        <DayPreview
          selectedDate={selectedDate}
          selectedEntry={selectedEntry ?? null}
          isLoading={isLoading}
          error={error}
          onViewEntry={handleViewEntry}
          onAddEntry={handleAddNewEntry}
        />

        {/* Minimalistic Guide - Edge-to-Edge */}
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
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    animatedContainer: {
      flex: 1,
    },
    // Edge-to-Edge Guide Card
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
