import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';

import type { AppTheme } from '../../themes/types';

interface AboutSettingsProps {
  onNavigateToPrivacyPolicy: () => void;
  onNavigateToTermsOfService: () => void;
  onNavigateToHelp: () => void;
  onNavigateToWhyGratitude: () => void;
}

const AboutSettings: React.FC<AboutSettingsProps> = ({
  onNavigateToPrivacyPolicy,
  onNavigateToTermsOfService,
  onNavigateToHelp,
  onNavigateToWhyGratitude,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const settingItems = [
    {
      label: t('settings.about.whyGratitude.label'),
      icon: 'heart-outline',
      action: onNavigateToWhyGratitude,
      description: t('settings.about.whyGratitude.description'),
    },
    {
      label: t('settings.about.privacyPolicy.label'),
      icon: 'shield-check-outline',
      action: onNavigateToPrivacyPolicy,
      description: t('settings.about.privacyPolicy.description'),
    },
    {
      label: t('settings.about.termsOfService.label'),
      icon: 'file-document-outline',
      action: onNavigateToTermsOfService,
      description: t('settings.about.termsOfService.description'),
    },
    {
      label: t('settings.about.helpSupport.label'),
      icon: 'help-circle-outline',
      action: onNavigateToHelp,
      description: t('settings.about.helpSupport.description'),
    },
  ];

  return (
    <View style={styles.container}>
      {settingItems.map((item, index) => (
        <View
          key={item.label}
          style={[styles.settingCard, index === settingItems.length - 1 && styles.lastCard]}
        >
          <TouchableOpacity style={styles.settingContent} onPress={item.action}>
            <View style={styles.iconContainer}>
              <Icon name={item.icon} size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>{item.label}</Text>
              <Text style={styles.settingDescription}>{item.description}</Text>
            </View>
            <View style={styles.chevronContainer}>
              <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      // Remove container margins - let cards handle their own spacing like SettingsScreen
    },
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      // 🌟 Medium primary shadow for consistency with other settings - matches SettingsScreen pattern
      ...getPrimaryShadow.medium(theme),
    },
    lastCard: {
      marginBottom: 0,
    },
    settingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
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
    chevronContainer: {
      marginLeft: theme.spacing.xs,
    },
  });

export default AboutSettings;
