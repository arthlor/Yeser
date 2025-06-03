import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Switch from 'toggle-switch-react-native';

import { useTheme } from '../../providers/ThemeProvider';
import { parseTimeStringToValidDate } from '../../utils/dateUtils';
import ThemedCard from '../ThemedCard'; // Assuming ThemedCard is in src/components/

import type { AppTheme } from '../../themes/types';

interface DailyReminderSettingsProps {
  reminderEnabled: boolean;
  reminderTime: string | null | undefined;
  onUpdateSettings: (settings: { reminder_enabled: boolean; reminder_time: string | null }) => void;
}

const DailyReminderSettings: React.FC<DailyReminderSettingsProps> = ({
  reminderEnabled,
  reminderTime,
  onUpdateSettings,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => parseTimeStringToValidDate(reminderTime));

  useEffect(() => {
    setSelectedTime(parseTimeStringToValidDate(reminderTime));
  }, [reminderTime]);

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (date) {
      setSelectedTime(date);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const formattedTime = `${hours}:${minutes}:${seconds}`;

      onUpdateSettings({
        reminder_enabled: true,
        reminder_time: formattedTime,
      });
    }
  };

  const toggleReminderSwitch = (isEnabled: boolean) => {
    if (isEnabled) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      const seconds = String(selectedTime.getSeconds()).padStart(2, '0');
      const formattedTime = `${hours}:${minutes}:${seconds}`;
      onUpdateSettings({
        reminder_enabled: true,
        reminder_time: formattedTime,
      });
    } else {
      onUpdateSettings({
        reminder_enabled: false,
        reminder_time: null,
      });
    }
  };

  const formattedSelectedTime = selectedTime
    .toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(':', '.');

  return (
    <ThemedCard style={styles.card}>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Günlük Hatırlatıcı</Text>
        <Switch
          isOn={reminderEnabled}
          onColor={theme.colors.primary}
          offColor={theme.colors.border}
          size="medium"
          onToggle={toggleReminderSwitch}
        />
      </View>
      {reminderEnabled && (
        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => {
            setShowTimePicker(true);
          }}
          accessibilityLabel={`Current reminder time: ${formattedSelectedTime}`}
          accessibilityHint="Tap to change reminder time"
          accessibilityRole="button"
        >
          <Text style={styles.timePickerButtonText}>Saat: {formattedSelectedTime}</Text>
        </TouchableOpacity>
      )}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          textColor={theme.colors.text}
          accentColor={theme.colors.primary}
          accessibilityLabel="Select reminder time"
          accessibilityHint="Choose the time for daily reminders"
        />
      )}
    </ThemedCard>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.medium,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.medium,
    },
    settingText: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamilyRegular,
    },
    timePickerButton: {
      marginTop: theme.spacing.small,
      paddingVertical: theme.spacing.small,
      paddingHorizontal: theme.spacing.medium,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      alignSelf: 'flex-start',
    },
    timePickerButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
      fontFamily: theme.typography.fontFamilyRegular,
    },
  });

export default DailyReminderSettings;
