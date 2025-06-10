import { DateData } from 'react-native-calendars';

import { GratitudeEntry } from '../../schemas/gratitudeEntrySchema';

// Custom marked dates type for calendar
export type CustomMarkedDates = Record<
  string,
  {
    marked?: boolean;
    dotColor?: string;
    activeOpacity?: number;
    disableTouchEvent?: boolean;
    selected?: boolean;
    selectedColor?: string;
    selectedTextColor?: string;
  }
>;

// Calendar statistics interface
export interface CalendarStatsData {
  entryCount: number;
  monthlyStreak: number;
  totalDays: number;
  completionRate: number;
}

// Calendar theme configuration
export interface CalendarThemeConfig {
  calendarBackground: string;
  textSectionTitleColor: string;
  selectedDayBackgroundColor: string;
  selectedDayTextColor: string;
  todayTextColor: string;
  dayTextColor: string;
  textDisabledColor: string;
  dotColor: string;
  selectedDotColor: string;
  arrowColor: string;
  monthTextColor: string;
  indicatorColor: string;
  textDayFontFamily: string;
  textMonthFontFamily: string;
  textDayHeaderFontFamily: string;
  textDayFontSize: number;
  textMonthFontSize: number;
  textDayHeaderFontSize: number;
  monthNames: string[];
  dayNames: string[];
  dayNamesShort: string[];
}

// Day preview state
export interface DayPreviewState {
  selectedDate: string | null;
  selectedEntry: GratitudeEntry | null;
  isLoading: boolean;
  error: string | null;
}

// Calendar header props
export interface CalendarHeaderProps {
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  isLoading?: boolean;
  isNextMonthDisabled?: boolean;
}

// Calendar day component props
export interface CalendarDayProps {
  date: DateData | null;
  state: 'disabled' | 'today' | undefined;
  marking: {
    marked?: boolean;
    selected?: boolean;
    dotColor?: string;
  };
  onPress: (date: DateData) => void;
  maxDate?: string;
}

// Calendar stats card props
export interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  color: string;
  isLoading?: boolean;
}

// Day preview card props
export interface DayPreviewProps {
  selectedDate: string | null;
  selectedEntry: GratitudeEntry | null;
  isLoading: boolean;
  error: string | null;
  onViewEntry: () => void;
  onAddEntry: () => void;
}

// Calendar view props
export interface CalendarViewProps {
  markedDates: CustomMarkedDates;
  currentMonth: Date;
  onMonthChange: (dateData: DateData) => void;
  onDayPress: (day: DateData) => void;
  isLoading?: boolean;
  isFutureMonth?: boolean;
}

// Turkish localization
export interface CalendarLocalization {
  months: string[];
  days: string[];
  daysShort: string[];
}
