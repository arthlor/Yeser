import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CalendarDayProps } from './types';
import { isToday } from './utils';
import { useTheme } from '../../providers/ThemeProvider';

const CalendarDay: React.FC<CalendarDayProps> = ({ date, state, marking, onPress }) => {
  const { theme } = useTheme();

  // Calculate values for styling
  const dayNumber = date ? new Date(date.timestamp).getDate() : 0;
  const isSelectedDay = marking?.selected ?? false;
  const hasEntry = marking?.marked ?? false;
  const isTodayDate = date ? isToday(date.dateString) : false;
  const isDisabled = state === 'disabled';

  // Memoized styles to avoid inline styles
  const textStyle = React.useMemo(
    () => ({
      color: isDisabled
        ? (theme.colors.surfaceDisabled ?? `${theme.colors.onSurface}40`)
        : isSelectedDay
          ? theme.colors.onPrimary
          : isTodayDate
            ? theme.colors.primary
            : theme.colors.onSurface,
      fontWeight: (isTodayDate || isSelectedDay ? '600' : '400') as
        | 'normal'
        | 'bold'
        | '100'
        | '200'
        | '300'
        | '400'
        | '500'
        | '600'
        | '700'
        | '800'
        | '900',
    }),
    [isDisabled, isSelectedDay, isTodayDate, theme.colors]
  );

  const containerStyle = React.useMemo(
    () => ({
      backgroundColor: isSelectedDay
        ? theme.colors.primary
        : isTodayDate && !isSelectedDay
          ? `${theme.colors.primary}10`
          : 'transparent',
    }),
    [isSelectedDay, isTodayDate, theme.colors.primary]
  );

  // Early return after all hooks
  if (!date) {
    return null;
  }

  const handlePress = () => {
    if (!isDisabled) {
      onPress(date);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.dayContainer, containerStyle]}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityLabel={`${dayNumber} ${hasEntry ? 'şükür notu var' : 'şükür notu yok'}`}
      accessibilityRole="button"
      accessibilityState={{
        selected: isSelectedDay,
        disabled: isDisabled,
      }}
    >
      <Text style={[styles.dayText, theme.typography.bodyLarge, textStyle]}>{dayNumber}</Text>
      {hasEntry && (
        <View
          style={[
            styles.entryDot,
            {
              backgroundColor: isSelectedDay ? theme.colors.onPrimary : theme.colors.primary,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dayContainer: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    borderRadius: 21,
    position: 'relative',
  },
  dayText: {
    textAlign: 'center',
  },
  entryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 6,
  },
});

export default CalendarDay;
