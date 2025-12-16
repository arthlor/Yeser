import React, { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { type SupportedLanguage, useLanguageStore } from '@/store/languageStore';
import { useUserProfile } from '@/shared/hooks';

const LANGUAGES: { code: SupportedLanguage; labelKey: string }[] = [
  { code: 'tr', labelKey: 'settings.language.tr' },
  { code: 'en', labelKey: 'settings.language.en' },
  { code: 'es', labelKey: 'settings.language.es' },
];

export const LanguageSettings: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { updateProfile } = useUserProfile();

  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (value: SupportedLanguage) => {
      if (value !== language) {
        setLanguage(value);
        updateProfile({ language: value });
      }
      setIsOpen(false);
    },
    [language, setLanguage, updateProfile]
  );

  const toggleOpen = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen((prev) => !prev);
  }, []);

  const currentLanguageLabel = useMemo(() => {
    const currentLang = LANGUAGES.find((l) => l.code === language);
    return currentLang ? t(currentLang.labelKey) : '';
  }, [language, t]);

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Icon name="translate" size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t('settings.language.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.language.description')}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Dropdown Section */}
      <View style={styles.dropdownSection}>
        <TouchableOpacity
          style={[styles.dropdownTrigger, isOpen && styles.dropdownTriggerOpen]}
          onPress={toggleOpen}
          activeOpacity={0.7}
          accessibilityRole="combobox"
          accessibilityState={{ expanded: isOpen }}
        >
          <Text style={styles.dropdownValue}>{currentLanguageLabel}</Text>
          <Icon
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdownList}>
            {LANGUAGES.map((lang, index) => {
              const isSelected = lang.code === language;
              const isLast = index === LANGUAGES.length - 1;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.dropdownOption,
                    isSelected && styles.dropdownOptionSelected,
                    !isLast && styles.dropdownOptionBorder,
                  ]}
                  onPress={() => handleSelect(lang.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {t(lang.labelKey)}
                  </Text>
                  {isSelected && <Icon name="check" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
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
      marginHorizontal: theme.spacing.md,
      overflow: 'hidden',
    },
    headerRow: {
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
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginLeft: theme.spacing.md + 32 + theme.spacing.sm,
    },
    dropdownSection: {
      padding: theme.spacing.md,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceVariant + '30',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      minHeight: 44,
    },
    dropdownTriggerOpen: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      backgroundColor: theme.colors.primaryContainer + '30',
    },
    dropdownValue: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
    dropdownList: {
      backgroundColor: theme.colors.surfaceVariant + '20',
      borderBottomLeftRadius: theme.borderRadius.md,
      borderBottomRightRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    dropdownOptionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
    },
    dropdownOptionSelected: {
      backgroundColor: theme.colors.primaryContainer + '20',
    },
    dropdownOptionText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
    },
    dropdownOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

export default LanguageSettings;
