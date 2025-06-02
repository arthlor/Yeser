import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Switch from 'toggle-switch-react-native';

import ThemedCard from '../ThemedCard';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme, ThemeName } from '../../themes/types';

interface AppearanceSettingsProps {
  activeThemeName: ThemeName;
  onToggleTheme: () => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  activeThemeName,
  onToggleTheme,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Determine if the dark theme is active for the switch state
  const isDarkThemeActive = activeThemeName === 'dark';

  return (
    <ThemedCard style={styles.card}>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Koyu Tema</Text>
        <Switch
          isOn={isDarkThemeActive}
          onColor={theme.colors.primary}
          offColor={theme.colors.border}
          size="medium"
          onToggle={onToggleTheme} // Directly use the passed toggler
        />
      </View>
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
  });

export default AppearanceSettings;
