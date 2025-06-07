import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { CalendarHeaderProps } from './types';
import { formatMonthYear } from './utils';
import { useTheme } from '../../providers/ThemeProvider';

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  isLoading = false,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: theme.spacing.page,
          paddingVertical: theme.spacing.md,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPreviousMonth}
        disabled={isLoading}
        style={[
          styles.navButton,
          {
            opacity: isLoading ? 0.3 : 1,
          },
        ]}
        accessibilityLabel="Önceki ay"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon name="chevron-left" size={28} color={theme.colors.onSurface} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text
          style={[
            styles.monthTitle,
            theme.typography.headlineSmall,
            { color: theme.colors.onSurface },
          ]}
        >
          {formatMonthYear(currentMonth)}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onNextMonth}
        disabled={isLoading}
        style={[
          styles.navButton,
          {
            opacity: isLoading ? 0.3 : 1,
          },
        ]}
        accessibilityLabel="Sonraki ay"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon name="chevron-right" size={28} color={theme.colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default CalendarHeader;
