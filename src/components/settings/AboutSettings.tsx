import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../providers/ThemeProvider';
import ThemedCard from '../ThemedCard';
import ThemedDivider from '../ThemedDivider';

import type { AppTheme } from '../../themes/types';

interface AboutSettingsProps {
  onNavigateToPrivacyPolicy: () => void;
  onNavigateToTermsOfService: () => void;
  onNavigateToHelp: () => void;
}

const AboutSettings: React.FC<AboutSettingsProps> = ({
  onNavigateToPrivacyPolicy,
  onNavigateToTermsOfService,
  onNavigateToHelp,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const settingItems = [
    {
      label: 'Gizlilik Politikası',
      icon: 'shield-lock-outline',
      action: onNavigateToPrivacyPolicy,
    },
    {
      label: 'Kullanım Şartları',
      icon: 'file-document-outline',
      action: onNavigateToTermsOfService,
    },
    {
      label: 'Yardım & Destek',
      icon: 'help-circle-outline',
      action: onNavigateToHelp,
    },
  ];

  return (
    <ThemedCard style={styles.card}>
      {settingItems.map((item, index) => (
        <React.Fragment key={item.label}>
          <TouchableOpacity style={styles.settingItem} onPress={item.action}>
            <Icon
              name={item.icon}
              size={22}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
            <Text style={styles.settingText}>{item.label}</Text>
            <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {index < settingItems.length - 1 && <ThemedDivider style={styles.divider} />}
        </React.Fragment>
      ))}
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
      alignItems: 'center',
      paddingVertical: theme.spacing.large, // Increased padding for better touch targets
    },
    icon: {
      marginRight: theme.spacing.medium,
    },
    settingText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamilyRegular,
    },
    divider: {
      // ThemedDivider might have its own margin/padding, adjust if necessary
    },
  });

export default AboutSettings;
