import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { type SupportedLanguage, useLanguageStore } from '@/store/languageStore';
import { useUserProfile } from '@/shared/hooks';

interface LanguageOptionProps {
  label: string;
  value: SupportedLanguage;
  selected: boolean;
  onSelect: (value: SupportedLanguage) => void;
}

const LanguageOption: React.FC<LanguageOptionProps> = ({ label, value, selected, onSelect }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <TouchableOpacity
      style={[styles.option, selected ? styles.optionSelected : undefined]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.optionLeft}>
        <Icon
          name={selected ? 'radiobox-marked' : 'radiobox-blank'}
          size={20}
          color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
        <Text style={styles.optionLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const LanguageSettings: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, i18n } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { updateProfile } = useUserProfile();

  const handleSelect = useCallback(
    (value: SupportedLanguage) => {
      if (value !== language) {
        setLanguage(value);
        updateProfile({ language: value });
      }
    },
    [language, setLanguage, updateProfile]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('settings.language.title')}</Text>
      <Text style={styles.description}>{t('settings.language.description')}</Text>

      <View style={styles.optionsRow}>
        <LanguageOption
          label={t('settings.language.tr')}
          value="tr"
          selected={(i18n.language as SupportedLanguage) !== 'en'}
          onSelect={handleSelect}
        />
        <LanguageOption
          label={t('settings.language.en')}
          value="en"
          selected={(i18n.language as SupportedLanguage) === 'en'}
          onSelect={handleSelect}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      padding: theme.spacing.md,
      ...getPrimaryShadow.medium(theme),
    },
    title: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    description: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.md,
    },
    optionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    option: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + '33',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      ...getPrimaryShadow.small(theme),
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer + '22',
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    optionLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
  });

export default LanguageSettings;
