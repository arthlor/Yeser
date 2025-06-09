import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CalendarDayProps } from './types';
import { isToday } from './utils';
import { useTheme } from '../../providers/ThemeProvider';

const CalendarDay: React.FC<CalendarDayProps> = ({ date, state, marking, onPress }) => {
  const { theme } = useTheme();

  if (!date) {
    return null;
  }

  const dayNumber = new Date(date.timestamp).getDate();
  const isSelectedDay = marking.selected;
  const hasEntry = marking.marked;
  const isTodayDate = isToday(date.dateString);
  const isDisabled = state === 'disabled';

  const handlePress = () => {
    if (!isDisabled) {
      onPress(date);
    }
  };

  const getTextColor = () => {
    if (isDisabled) {
      return theme.colors.surfaceDisabled ?? `${theme.colors.onSurface}40`;
    }
    if (isSelectedDay) {
      return theme.colors.onPrimary;
    }
    if (isTodayDate) {
      return theme.colors.primary;
    }
    return theme.colors.onSurface;
  };

  const getBackgroundColor = () => {
    if (isSelectedDay) {
      return theme.colors.primary;
    }
    if (isTodayDate && !isSelectedDay) {
      return `${theme.colors.primary}10`;
    }
    return 'transparent';
  };

  return (
    <TouchableOpacity
      style={[
        styles.dayContainer,
        {
          backgroundColor: getBackgroundColor(),
        },
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityLabel={`${dayNumber} ${hasEntry ? 'şükür notu var' : 'şükür notu yok'}`}
      accessibilityRole="button"
      accessibilityState={{
        selected: isSelectedDay,
        disabled: isDisabled,
      }}
    >
      <Text
        style={[
          styles.dayText,
          theme.typography.bodyLarge,
          {
            color: getTextColor(),
            fontWeight: isTodayDate || isSelectedDay ? '600' : '400',
          },
        ]}
      >
        {dayNumber}
      </Text>
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
