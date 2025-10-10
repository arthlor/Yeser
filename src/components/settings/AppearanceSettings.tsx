import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';

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
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const isDarkThemeActive = activeThemeName === 'dark';

  return (
    <View style={styles.settingCard}>
      <TouchableOpacity style={styles.settingRow} onPress={onToggleTheme}>
        <View style={styles.settingInfo}>
          <View style={styles.iconContainer}>
            <Icon
              name={isDarkThemeActive ? 'weather-night' : 'weather-sunny'}
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>{t('settings.appearance.title')}</Text>
            <Text style={styles.settingDescription}>
              {isDarkThemeActive
                ? t('settings.appearance.darkTheme')
                : t('settings.appearance.lightTheme')}
            </Text>
          </View>
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
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      // 🌟 Medium primary shadow for interactive setting cards
      ...getPrimaryShadow.medium(theme),
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    textContainer: {
      flex: 1,
    },
    settingTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
    },
    settingDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
  });

export default AppearanceSettings;
