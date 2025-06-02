import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Importing from actual project files where they exist or creating placeholder types and APIs
import ThemedCard from '../components/ThemedCard';
import { useTheme } from '../providers/ThemeProvider';
import type { GratitudeEntry } from '../schemas/gratitudeEntrySchema';
import {
  getEntryDatesForMonth,
  getGratitudeDailyEntryByDate as getGratitudeEntryByDateAPI,
} from '../api/gratitudeApi';

type RootStackParamList = {
  Home: undefined;
  EntryDetail: { entryId: string };
  EnhancedDailyEntry: { dateString?: string; entry?: GratitudeEntry | null }; // Added for navigation
};

type RootTabParamList = {
  DailyEntryTab: { date?: string; entry?: GratitudeEntry | null }; // Ensure consistent params
  CalendarView: undefined;
  Settings: undefined;
};

// Placeholder analytics service
const analyticsService = {
  logEvent: (eventName: string, params?: Record<string, any>) => {
    console.log(`Analytics: ${eventName}`, params);
  },
};

// Simple date formatter function
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Define custom type for calendar marked dates
type CustomMarkedDates = {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    activeOpacity?: number;
    disableTouchEvent?: boolean;
    selected?: boolean;
    selectedColor?: string;
    selectedTextColor?: string;
  };
};

// Define the navigation prop type for this screen
type CalendarViewScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'CalendarView'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * A StatCard component to display calendar statistics
 */
const StatCard: React.FC<{
  icon: string;
  value: string | number;
  label: string;
  color: string;
}> = ({ icon, value, label, color }) => (
  <ThemedCard style={styles.statCard} elevation="sm">
    <View style={styles.statCardContent}>
      <Icon name={icon} size={24} color={color} style={styles.statIcon} />
      <View style={styles.statTextContainer}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  </ThemedCard>
);

/**
 * EnhancedCalendarViewScreen component
 */
const EnhancedCalendarViewScreen: React.FC = () => {
  const navigation = useNavigation<CalendarViewScreenNavigationProp>();
  const { theme } = useTheme();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  
  // State for month navigation and data
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<CustomMarkedDates>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<GratitudeEntry | null>(null); // Updated type
  
  // State for loading and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize animation on component mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY]);

  // Get count of days with entries in current month
  const getEntryCount = (): number => {
    return Object.keys(markedDates).filter(date => markedDates[date].marked).length;
  };

  // Calculate longest streak in current month
  const getMonthlyStreak = (): number => {
    const dates = Object.keys(markedDates)
      .filter(date => markedDates[date].marked)
      .sort();
    
    if (dates.length === 0) return 0;
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      const prevDate = new Date(dates[i - 1]);
      
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  };

  // Fetch days with entries for the current month
  const fetchMarkedDates = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);
    // console.log(`Fetching marked dates for: ${date.getFullYear()}-${date.getMonth() + 1}`);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const entryDates = await getEntryDatesForMonth(year, month);
      const newMarkedDates: CustomMarkedDates = {};
      entryDates.forEach((entryDate: string) => {
        newMarkedDates[entryDate] = {
          marked: true,
          dotColor: theme.colors.primary,
          activeOpacity: 0.8,
        };
      });

      // Preserve selection if the selected date is in the new marked dates
      if (selectedDate && newMarkedDates[selectedDate]) {
        newMarkedDates[selectedDate] = {
          ...newMarkedDates[selectedDate],
          selected: true,
          selectedColor: theme.colors.primaryContainer,
          selectedTextColor: theme.colors.onPrimaryContainer,
        };
      }
      setMarkedDates(newMarkedDates);
      // analyticsService.logEvent('calendar_month_viewed', { year, month, entry_count: entryDates.length });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Takvim verileri alınırken bir hata oluştu.';
      setError(errorMessage);
      // console.error('Error fetching marked dates:', errorMessage);
      setMarkedDates({});
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.colors.primary, theme.colors.primaryContainer, theme.colors.onPrimaryContainer, selectedDate, setIsLoading, setError, setMarkedDates /* getEntryDatesForMonth, analyticsService should be stable or added */]);

  const internalFetchMarkedDates = fetchMarkedDates; // Alias for useEffect dependency

  useEffect(() => {
    // console.log(`useEffect triggered for currentMonth: ${currentMonth.toISOString()}`);
    internalFetchMarkedDates(currentMonth);
  }, [currentMonth, internalFetchMarkedDates]);

  const handleMonthChange = useCallback(
    (dateData: DateData) => {
      // console.log('Calendar onMonthChange (swipe) triggered with:', dateData);
      const newMonthDate = new Date(dateData.timestamp);
      
      // Update currentMonth state. This will trigger the useEffect hook 
      // which calls fetchMarkedDates to load data for the new month.
      setCurrentMonth(newMonthDate);

      analyticsService.logEvent('calendar_month_changed_by_swipe', {
        year: newMonthDate.getFullYear(),
        month: newMonthDate.getMonth() + 1,
      });
    },
    [setCurrentMonth] // analyticsService is stable and defined outside, setCurrentMonth is stable
  );

  // Handle day selection in calendar
  const handleDayPress = async (day: DateData): Promise<void> => {
    const newSelectedDate = day.dateString;
    setSelectedDate(newSelectedDate);
    
    // Update marked dates to show selection
    const updatedMarkedDates = { ...markedDates };
    
    // Remove previous selection
    Object.keys(updatedMarkedDates).forEach(date => {
      if (updatedMarkedDates[date].selected) {
        updatedMarkedDates[date] = {
          ...updatedMarkedDates[date],
          selected: false,
        };
      }
    });
    
    // Add new selection
    updatedMarkedDates[newSelectedDate] = {
      ...updatedMarkedDates[newSelectedDate],
      selected: true,
      selectedColor: theme.colors.primaryContainer,
      selectedTextColor: theme.colors.onPrimaryContainer,
      marked: updatedMarkedDates[newSelectedDate]?.marked || false,
      dotColor: updatedMarkedDates[newSelectedDate]?.marked ? theme.colors.primary : undefined,
    };
    
    setMarkedDates(updatedMarkedDates);
    
    try {
      setIsLoading(true);
      const entry: GratitudeEntry | null = await getGratitudeEntryByDateAPI(newSelectedDate);
      if (entry) {
        setSelectedEntry(entry);
        
        analyticsService.logEvent('calendar_day_selected', {
          date: newSelectedDate,
          has_entry: !!entry,
        });
      }
    } catch (e: unknown) {
      console.error('Error fetching entry for date:', newSelectedDate, e);
      setSelectedEntry(null);
      setError('Seçili günlük alınırken bir hata oluştu.'); // More specific error message
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to create a new entry
  const handleAddNewEntry = (): void => {
    analyticsService.logEvent('add_entry_from_calendar', {
      date: selectedDate || new Date().toISOString().split('T')[0],
    });
    
    navigation.navigate('DailyEntryTab', {
      date: selectedDate || new Date().toISOString().split('T')[0],
    });
  };
  
  // Navigate to view an existing entry
  const handleViewEntry = (): void => {
    if (selectedEntry && selectedEntry.id) {
      analyticsService.logEvent('view_entry_from_calendar', {
        date: selectedDate,
        entry_id: selectedEntry.id,
      });
      
      navigation.navigate('EntryDetail', { entryId: selectedEntry.id });
    }
  };

  // Define Turkish month and day names for localization
  const turkishMonths = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const turkishDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const turkishDaysShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  
  // Custom function to format month name in Turkish
  const formatMonthYear = (date: Date): string => {
    const month = turkishMonths[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  };
  
  // Calendar theme configuration
  const calendarTheme = useMemo(
    () => ({
      calendarBackground: 'transparent',
      textSectionTitleColor: theme.colors.onBackground,
      selectedDayBackgroundColor: theme.colors.primary,
      selectedDayTextColor: theme.colors.onPrimary,
      todayTextColor: theme.colors.primary,
      dayTextColor: theme.colors.onSurface,
      textDisabledColor: theme.colors.surfaceDisabled || theme.colors.onSurface + '40', // 40 is alpha for 25% opacity
      dotColor: theme.colors.primary,
      selectedDotColor: theme.colors.onPrimary,
      arrowColor: theme.colors.primary,
      monthTextColor: theme.colors.onBackground,
      indicatorColor: theme.colors.primary,
      textDayFontFamily: 'System',
      textMonthFontFamily: 'System',
      textDayHeaderFontFamily: 'System',
      textDayFontSize: 16,
      textMonthFontSize: 16,
      textDayHeaderFontSize: 14,
      // Turkish localization
      monthNames: turkishMonths,
      dayNames: turkishDays,
      dayNamesShort: turkishDaysShort
    }),
    [theme.colors]
  );

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMarkedDates(currentMonth);
      
      // Reset selected entry when screen is focused again
      if (selectedDate) {
        getGratitudeEntryByDateAPI(selectedDate)
          .then((entry: GratitudeEntry | null) => {
            setSelectedEntry(entry);
          })
          .catch((e: unknown) => {
            console.error('Error refreshing entry:', e);
            setSelectedEntry(null);
          });
      }
    }, [currentMonth, fetchMarkedDates, selectedDate])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar backgroundColor={theme.colors.background} barStyle="dark-content" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Calendar */}
          <ThemedCard style={styles.calendarCard} elevation="md">
            <Calendar
              current={currentMonth.toISOString()}
              onMonthChange={handleMonthChange}
              onDayPress={handleDayPress}
              markedDates={markedDates}
              theme={calendarTheme}
              enableSwipeMonths={true}
              hideExtraDays={false}
              firstDay={1}
              style={styles.calendar}
              key={currentMonth.toISOString()} // Force re-render on month change
              // Custom header with Turkish month format
              renderHeader={(date) => {
                // Handle possible undefined date by using current month as fallback
                const headerDate = date ? new Date(date.toString()) : currentMonth;
                return (
                      <Text style={[styles.monthHeaderText, { color: theme.colors.onBackground }]}>
                        {formatMonthYear(headerDate)}
                      </Text>
                );
              }}
              // Ensure day names are displayed in Turkish
              dayComponent={({ date, state }) => {
                if (!date) return null;
                const day = new Date(date.timestamp).getDate();
                const isSelected = selectedDate === date.dateString;
                return (
                  <TouchableOpacity 
                    style={[
                      styles.dayContainer,
                      isSelected && { backgroundColor: theme.colors.primaryContainer, borderRadius: 18 }
                    ]}
                    onPress={() => handleDayPress(date)}
                  >
                    <Text 
                      style={[
                        styles.dayText, 
                        { color: state === 'disabled' 
                          ? theme.colors.surfaceDisabled || theme.colors.onSurface + '40'
                          : isSelected
                            ? theme.colors.onPrimaryContainer
                            : state === 'today' 
                              ? theme.colors.primary 
                              : theme.colors.onSurface 
                        }
                      ]}
                    >
                      {day}
                    </Text>
                    {markedDates[date.dateString]?.marked && (
                      <View 
                        style={[
                          styles.dateDot, 
                          { 
                            backgroundColor: isSelected 
                              ? theme.colors.onPrimaryContainer 
                              : theme.colors.primary 
                          }
                        ]} 
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              customHeader={() => {
                return (
                  <View>
                    <View style={styles.monthHeaderContainer}>
                      <TouchableOpacity
                        onPress={() => {
                          const prevMonthDate = new Date(currentMonth);
                          prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
                          // console.log('Custom prev arrow pressed, new month:', prevMonthDate.toISOString());
                          setCurrentMonth(prevMonthDate); // Triggers useEffect for fetchMarkedDates
                          analyticsService.logEvent('calendar_month_changed_by_arrow', {
                            direction: 'previous',
                            year: prevMonthDate.getFullYear(),
                            month: prevMonthDate.getMonth() + 1,
                          });
                        }}
                        style={styles.arrowButton}
                      >
                        <Icon name="chevron-left" size={24} color={theme.colors.primary} />
                      </TouchableOpacity>
                      
                      <Text style={[styles.monthHeaderText, { color: theme.colors.onBackground }]}>
                        {formatMonthYear(currentMonth)}
                      </Text>
                      
                      <TouchableOpacity
                        onPress={() => {
                          const nextMonthDate = new Date(currentMonth);
                          nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
                          // console.log('Custom next arrow pressed, new month:', nextMonthDate.toISOString());
                          setCurrentMonth(nextMonthDate); // Triggers useEffect for fetchMarkedDates
                          analyticsService.logEvent('calendar_month_changed_by_arrow', {
                            direction: 'next',
                            year: nextMonthDate.getFullYear(),
                            month: nextMonthDate.getMonth() + 1,
                          });
                        }}
                        style={styles.arrowButton}
                      >
                        <Icon name="chevron-right" size={24} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.weekdayHeaderContainer}>
                      {turkishDaysShort.map((day, index) => (
                        <Text 
                          key={index} 
                          style={[styles.weekdayHeaderText, { color: theme.colors.onSurface }]}
                        >
                          {day}
                        </Text>
                      ))}
                    </View>
                  </View>
                );
              }}            />
          </ThemedCard>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <StatCard
              icon="calendar-check"
              value={getEntryCount()}
              label="Bu ay yazılan"
              color={theme.colors.primary}
            />
            <StatCard
              icon="fire"
              value={getMonthlyStreak()}
              label="En uzun seri"
              color={theme.colors.tertiary}
            />
          </View>

          {/* Selected Day Preview */}
          {selectedDate && (
            <ThemedCard style={styles.previewCard} elevation="md">
              <View style={styles.previewHeader}>
                <Text style={[styles.previewDate, { color: theme.colors.onSurface }]}>
                  {formatDate(selectedDate)}
                </Text>
              </View>
              
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary}
                  style={styles.loader}
                />
              ) : selectedEntry ? (
                <TouchableOpacity onPress={handleViewEntry} style={styles.previewContent}>
                  <Text style={[styles.previewText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={3}>
                    {selectedEntry.statements.join('\n')}
                  </Text>
                  <View style={styles.previewFooter}>
                    <Text style={[styles.viewEntryText, { color: theme.colors.primary }]}>
                      Detayları Görüntüle
                    </Text>
                    <Icon name="chevron-right" size={18} color={theme.colors.primary} />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleAddNewEntry} style={styles.previewContent}>
                  <View style={styles.emptyEntryContainer}>
                    <Icon name="pencil-plus" size={32} color={theme.colors.onSurfaceVariant} />
                    <Text style={[styles.emptyEntryText, { color: theme.colors.onSurfaceVariant }]}>
                      Bu tarih için henüz bir şükür notu eklenmemiş.
                    </Text>
                    <View style={styles.previewFooter}>
                      <Text style={[styles.viewEntryText, { color: theme.colors.primary }]}>
                        Şükür Notu Ekle
                      </Text>
                      <Icon name="chevron-right" size={18} color={theme.colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </ThemedCard>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={24} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            </View>
          )}
          
          {/* Calendar Guide */}
          <ThemedCard style={styles.guideCard} elevation="sm">
            <View style={styles.guideContent}>
              <Icon name="information-outline" size={20} color={theme.colors.secondary} style={styles.guideIcon} />
              <Text style={[styles.guideText, { color: theme.colors.onSurface }]}>
                <Text style={{ fontWeight: 'bold' }}>•</Text> Noktalı günler şükür notları içerir.
                {"\n"}<Text style={{ fontWeight: 'bold' }}>•</Text> Bir tarihe tıklayarak not detaylarını görüntüleyebilirsiniz.
              </Text>
            </View>
          </ThemedCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthNavButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  calendarCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 0.48,
    borderRadius: 12,
    padding: 12,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  previewCard: {
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  previewHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  previewDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewContent: {
    padding: 16,
    paddingTop: 0,
  },
  previewText: {
    fontSize: 16,
    lineHeight: 24,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
  },
  viewEntryText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  emptyEntryContainer: {
    alignItems: 'center',
    padding: 16,
  },
  emptyEntryText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    padding: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 87, 87, 0.1)',
    borderRadius: 12,
    marginTop: 8,
  },
  errorText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  guideCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  guideContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  guideIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  monthHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
    paddingVertical: 8,
  },
  // Calendar custom components styles
  dayContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '400',
  },
  dateDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 6,
  },
  monthHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  arrowButton: {
    padding: 8,
  },
  weekdayHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 16,
  },
  weekdayHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default EnhancedCalendarViewScreen;
