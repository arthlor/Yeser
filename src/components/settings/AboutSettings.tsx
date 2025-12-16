import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../providers/ThemeProvider';

import type { AppTheme } from '../../themes/types';

import { useSubscription } from '@/hooks/useSubscription';
import { ProBadge } from '@/features/subscription/components/ProBadge';

interface AboutSettingsProps {
  onNavigateToPrivacyPolicy: () => void;
  onNavigateToTermsOfService: () => void;
  onNavigateToHelp: () => void;
  onNavigateToWhyGratitude: () => void;
  onNavigateToMoodAnalysis: () => void;
}

const AboutSettings: React.FC<AboutSettingsProps> = ({
  onNavigateToPrivacyPolicy,
  onNavigateToTermsOfService,
  onNavigateToHelp,
  onNavigateToWhyGratitude,
  onNavigateToMoodAnalysis,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const { isPro } = useSubscription();

  const settingItems = [
    {
      label: t('settings.about.moodAnalysis.label'),
      icon: 'chart-arc',
      action: onNavigateToMoodAnalysis,
      description: t('settings.about.moodAnalysis.description'),
      showProBadge: !isPro,
    },
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
        <React.Fragment key={item.label}>
          <TouchableOpacity style={styles.row} onPress={item.action} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <Icon name={item.icon} size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{item.label}</Text>
                {item.showProBadge && <ProBadge size="small" style={styles.badgeMargin} />}
              </View>
              <Text style={styles.subtitle}>{item.description}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.outline} />
          </TouchableOpacity>
          {index < settingItems.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    badgeMargin: {
      marginLeft: 8,
    },
  });

export default AboutSettings;
