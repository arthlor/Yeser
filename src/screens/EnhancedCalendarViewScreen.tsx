// EnhancedCalendarViewScreen.tsx (Corrected - No Animations)
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Define a more specific type for our marked dates object
export type CustomMarkedDates = {
  [key: string]: {
    marked?: boolean;
    dotColor?: string;
    activeOpacity?: number;
    disableTouchEvent?: boolean;
    selected?: boolean;
    selectedColor?: string;
    selectedTextColor?: string;
  };
};

import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getEntryDatesForMonth,
  getGratitudeEntryByDate,
} from '../api/gratitudeApi';
import ThemedCard from '../components/ThemedCard';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';

type CalendarViewScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainAppTabParamList, 'CalendarTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const EnhancedCalendarViewScreen: React.FC = () => {
  const navigation = useNavigation<CalendarViewScreenNavigationProp>();
  const { theme } = useTheme();

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<CustomMarkedDates>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
    });
  };

  const fetchMarkedDates = useCallback(
    async (date: Date) => {
      setIsLoading(true);
      setError(null);

      try {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const entryDates = await getEntryDatesForMonth(year, month);

        const newMarkedDates: CustomMarkedDates = {};

        entryDates.forEach(entryDate => {
          newMarkedDates[entryDate] = {
            marked: true,
            dotColor: theme.colors.primary,
            activeOpacity: 0.8,
          };
        });

        if (selectedDate && newMarkedDates[selectedDate]) {
          newMarkedDates[selectedDate] = {
            ...newMarkedDates[selectedDate],
            selected: true,
            selectedColor: theme.colors.primaryContainer,
            selectedTextColor: theme.colors.onPrimaryContainer,
          };
        }

        setMarkedDates(newMarkedDates);

        analyticsService.logEvent('calendar_month_viewed', {
          year,
          month,
          entry_count: entryDates.length,
        });
      } catch (e: unknown) {
        console.error('Error fetching marked dates:', e);
        setError(
          e instanceof Error
            ? e.message
            : 'Takvim verileri alınırken bir hata oluştu.'
        );
        setMarkedDates({});
      } finally {
        setIsLoading(false);
      }
    },
    [
      theme.colors.primary,
      theme.colors.primaryContainer,
      theme.colors.onPrimaryContainer,
      selectedDate,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      fetchMarkedDates(currentMonth);
    }, [fetchMarkedDates, currentMonth])
  );

  const handleMonthChange = (dateData: DateData) => {
    const newDate = new Date(dateData.year, dateData.month - 1, 1);
    setCurrentMonth(newDate);
    fetchMarkedDates(newDate);
  };

  const handleDayPress = async (day: DateData) => {
    const newSelectedDate = day.dateString;
    setSelectedDate(newSelectedDate);

    const updatedMarkedDates = { ...markedDates };

    Object.keys(updatedMarkedDates).forEach(date => {
      if (updatedMarkedDates[date].selected) {
        updatedMarkedDates[date] = {
          ...updatedMarkedDates[date],
          selected: false,
        };
      }
    });

    if (updatedMarkedDates[newSelectedDate]?.marked) {
      updatedMarkedDates[newSelectedDate] = {
        ...updatedMarkedDates[newSelectedDate],
        selected: true,
        selectedColor: theme.colors.primaryContainer,
        selectedTextColor: theme.colors.onPrimaryContainer,
      };

      setMarkedDates(updatedMarkedDates);
      setIsLoading(true);

      try {
        const entry = await getGratitudeEntryByDate(newSelectedDate);
        if (entry) {
          analyticsService.logEvent('calendar_entry_viewed', {
            entry_date: newSelectedDate,
            entry_id: entry.id ?? null,
          });
          navigation.navigate('EntryDetail', { entry });
        } else {
          Alert.alert(
            'Kayıt Bulunamadı',
            'Bu tarih için bir şükran kaydı bulunamadı.'
          );
          if (updatedMarkedDates[newSelectedDate]) {
            updatedMarkedDates[newSelectedDate] = {
              ...updatedMarkedDates[newSelectedDate],
              selected: false,
            };
            setMarkedDates(updatedMarkedDates);
          }
          setSelectedDate(null);
        }
      } catch (err: unknown) {
        let message = 'Kayıt detayları alınırken bir sorun oluştu.';
        if (
          typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
        ) {
          message = (err as { message: string }).message;
        }
        console.error('Error fetching entry details:', err);
        Alert.alert('Hata', message);
        if (updatedMarkedDates[newSelectedDate]) {
          updatedMarkedDates[newSelectedDate] = {
            ...updatedMarkedDates[newSelectedDate],
            selected: false,
          };
          setMarkedDates(updatedMarkedDates);
        }
        setSelectedDate(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      setMarkedDates(updatedMarkedDates);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Şükran Takviminiz</Text>
        <Text style={styles.subtitle}>
          Geçmiş şükran kayıtlarınızı takvimde görüntüleyin
        </Text>
      </View>

      <View style={styles.calendarWrapper}>
        <ThemedCard
          variant="elevated"
          elevation="md"
          contentPadding="none"
          style={styles.calendarCard}
        >
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>
              {formatMonthYear(currentMonth)}
            </Text>
          </View>
          <Calendar
            current={currentMonth.toISOString().split('T')[0]}
            onMonthChange={handleMonthChange}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            markingType="custom"
            monthFormat={'yyyy MMMM'}
            hideExtraDays={false}
            firstDay={1}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: theme.colors.textSecondary,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: theme.colors.onPrimary,
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.onSurface,
              textDisabledColor: theme.colors.disabled,
              dotColor: theme.colors.primary,
              selectedDotColor: theme.colors.onPrimary,
              arrowColor: theme.colors.primary,
              disabledArrowColor: theme.colors.disabled,
              monthTextColor: theme.colors.onSurface,
              indicatorColor: theme.colors.primary,
              textDayFontFamily: theme.typography.bodyMedium.fontFamily,
              textMonthFontFamily: theme.typography.titleLarge.fontFamily,
              textDayHeaderFontFamily: theme.typography.labelMedium.fontFamily,
              textDayFontSize: theme.typography.bodyMedium.fontSize,
              textMonthFontSize: theme.typography.titleLarge.fontSize,
              textDayHeaderFontSize: theme.typography.labelMedium.fontSize,
            }}
          />
        </ThemedCard>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          <Text style={styles.legendText}>Şükran kaydı olan günler</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSquare,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          />
          <Text style={styles.legendText}>Seçili gün</Text>
        </View>
      </View>

      <ThemedCard
        variant="outlined"
        contentPadding="md"
        style={styles.instructionsCard}
      >
        <View style={styles.instructionRow}>
          <Icon
            name="calendar-check"
            size={24}
            color={theme.colors.primary}
            style={styles.instructionIcon}
          />
          <Text style={styles.instructionText}>
            Şükran kaydı olan günlere dokunarak detayları görüntüleyebilirsiniz.
          </Text>
        </View>
      </ThemedCard>

      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents={'auto'}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {error && (
        <ThemedCard
          variant="filled"
          contentPadding="md"
          style={styles.errorCard}
        >
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchMarkedDates(currentMonth)}
            accessibilityLabel="Yeniden dene"
            accessibilityHint="Takvim verilerini yeniden yüklemek için dokunun"
          >
            <Text style={styles.retryButtonText}>Yeniden Dene</Text>
          </TouchableOpacity>
        </ThemedCard>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
    },
    headerContainer: {
      marginBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    calendarWrapper: {
      marginBottom: theme.spacing.md,
    },
    calendarCard: {
      overflow: 'hidden',
    },
    monthHeader: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderTopLeftRadius: theme.borderRadius.md,
      borderTopRightRadius: theme.borderRadius.md,
    },
    monthTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: theme.spacing.xs,
    },
    legendSquare: {
      width: 14,
      height: 14,
      borderRadius: theme.borderRadius.xs,
      marginRight: theme.spacing.xs,
    },
    legendText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    instructionsCard: {
      marginBottom: theme.spacing.md,
    },
    instructionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    instructionIcon: {
      marginRight: theme.spacing.sm,
    },
    instructionText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      flex: 1,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    errorCard: {
      backgroundColor: theme.colors.errorContainer,
      marginBottom: theme.spacing.md,
    },
    errorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onErrorContainer,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      alignSelf: 'center',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.sm,
    },
    retryButtonText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onError,
    },
  });

export default EnhancedCalendarViewScreen;
