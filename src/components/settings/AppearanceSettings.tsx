import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';

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
            <Text style={styles.settingTitle}>Görünüm</Text>
            <Text style={styles.settingDescription}>
              {isDarkThemeActive ? 'Koyu tema' : 'Açık tema'}
            </Text>
          </View>
        </View>
        <View style={styles.toggleContainer}>
          <View
            style={[
              styles.toggle,
              {
                backgroundColor: isDarkThemeActive
                  ? theme.colors.primary
                  : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: theme.colors.surface,
                  transform: [
                    {
                      translateX: isDarkThemeActive ? 22 : 2,
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
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
    toggleContainer: {
      marginLeft: theme.spacing.sm,
    },
    toggle: {
      width: 50,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      padding: 2,
    },
    toggleThumb: {
      width: 26,
      height: 26,
      borderRadius: 13,
    },
  });

export default AppearanceSettings;
