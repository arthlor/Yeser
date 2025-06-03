import { Picker } from '@react-native-picker/picker';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Switch from 'toggle-switch-react-native';

import { useTheme } from '../../providers/ThemeProvider';
import ThemedCard from '../ThemedCard';

import type { Profile } from '../../schemas/profileSchema';
import type { AppTheme } from '../../themes/types';

const frequencyOptions: { label: string; value: Profile['throwback_reminder_frequency'] }[] = [
  { label: 'Günlük', value: 'daily' },
  { label: 'Haftalık', value: 'weekly' },
  { label: 'Aylık', value: 'monthly' },
];

interface ThrowbackReminderSettingsProps {
  throwbackEnabled: boolean;
  throwbackFrequency: Profile['throwback_reminder_frequency'];
  onUpdateSettings: (settings: {
    throwback_reminder_enabled: boolean;
    throwback_reminder_frequency: Profile['throwback_reminder_frequency'];
  }) => void;
}

const ThrowbackReminderSettings: React.FC<ThrowbackReminderSettingsProps> = ({
  throwbackEnabled,
  throwbackFrequency,
  onUpdateSettings,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [selectedFrequency, setSelectedFrequency] = useState<
    Profile['throwback_reminder_frequency']
  >(throwbackFrequency ?? 'weekly');

  useEffect(() => {
    setSelectedFrequency(throwbackFrequency ?? 'weekly');
  }, [throwbackFrequency]);

  const toggleThrowbackSwitch = (isEnabled: boolean) => {
    onUpdateSettings({
      throwback_reminder_enabled: isEnabled,
      throwback_reminder_frequency: selectedFrequency, // Use current local selection
    });
  };

  const handleFrequencyChange = (frequency: Profile['throwback_reminder_frequency']) => {
    setSelectedFrequency(frequency);
    onUpdateSettings({
      throwback_reminder_enabled: throwbackEnabled, // Keep current toggle state
      throwback_reminder_frequency: frequency,
    });
  };

  return (
    <ThemedCard style={styles.card}>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Geçmişe Dönük Hatırlatıcı</Text>
        <Switch
          isOn={throwbackEnabled}
          onColor={theme.colors.primary}
          offColor={theme.colors.border}
          size="medium"
          onToggle={toggleThrowbackSwitch}
        />
      </View>
      {throwbackEnabled && (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedFrequency}
            onValueChange={(itemValue) => {
              handleFrequencyChange(itemValue as Profile['throwback_reminder_frequency']);
            }}
            style={styles.picker}
            itemStyle={styles.pickerItem} // For iOS
            dropdownIconColor={theme.colors.text} // For Android dropdown arrow
          >
            {frequencyOptions.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
                color={theme.colors.text} // For iOS item text color
              />
            ))}
          </Picker>
        </View>
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
    pickerContainer: {
      marginTop: theme.spacing.small,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      // Picker styling can be platform-specific and sometimes tricky
    },
    picker: {
      width: '100%',
      color: theme.colors.text, // For Android picker text color
      // Height might be needed for Android to display properly
      // height: Platform.OS === 'android' ? 50 : undefined,
    },
    pickerItem: {
      // For iOS, itemStyle can control individual item text properties
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamilyRegular,
      // height: 120, // Example: Adjust height for iOS picker items if needed
    },
  });

export default ThrowbackReminderSettings;
