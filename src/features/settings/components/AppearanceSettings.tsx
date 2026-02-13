import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';
import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';

import type { AppTheme, ThemeName } from '@/themes/types';

interface AppearanceSettingsProps {
  activeThemeName: ThemeName;
  onToggleTheme: () => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  activeThemeName,
  onToggleTheme,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const isDarkThemeActive = activeThemeName === 'dark';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.row} onPress={onToggleTheme} activeOpacity={0.7}>
        <View style={styles.iconContainer}>
          <Icon
            name={isDarkThemeActive ? 'weather-night' : 'weather-sunny'}
            size={18}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t('settings.appearance.title')}</Text>
          <Text style={styles.subtitle}>
            {isDarkThemeActive
              ? t('settings.appearance.darkTheme')
              : t('settings.appearance.lightTheme')}
          </Text>
        </View>
        <ThemedSwitch
          value={isDarkThemeActive}
          onValueChange={onToggleTheme}
          size="medium"
          testID="appearance-theme-switch"
        />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContainer: {
      flex: 1,
    },
    title: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
  });

export default AppearanceSettings;
