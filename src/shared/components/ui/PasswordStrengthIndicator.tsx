import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import { getPasswordStrength } from '@/schemas/authSchemas';
import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme } from '@/themes/types';

interface PasswordStrengthIndicatorProps {
  password: string;
  style?: object;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!password) {
    return null;
  }

  const { strength, requirements } = getPasswordStrength(password);

  const getStrengthColor = () => {
    switch (strength) {
      case 'strong':
        return theme.colors.success;
      case 'good':
        return theme.colors.warning;
      case 'fair':
        return theme.colors.warning;
      default:
        return theme.colors.error;
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 'strong':
        return 'Güçlü';
      case 'good':
        return 'İyi';
      case 'fair':
        return 'Orta';
      default:
        return 'Zayıf';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Şifre Güvenliği: </Text>
        <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
          {getStrengthText()}
        </Text>
      </View>

      <View style={styles.requirementsList}>
        {requirements.map((requirement, index) => (
          <View key={index} style={styles.requirementRow}>
            <Ionicons
              name={requirement.met ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={requirement.met ? theme.colors.success : theme.colors.error}
              style={styles.requirementIcon}
            />
            <Text
              style={[
                styles.requirementText,
                {
                  color: requirement.met
                    ? theme.colors.onSurfaceVariant
                    : theme.colors.onSurfaceVariant,
                  opacity: requirement.met ? 1 : 0.7,
                },
              ]}
            >
              {requirement.text}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.meter}>
        <View style={styles.meterBackground}>
          <View
            style={[
              styles.meterFill,
              {
                width: `${(requirements.filter(r => r.met).length / requirements.length) * 100}%`,
                backgroundColor: getStrengthColor(),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      ...getPrimaryShadow.small(theme),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    strengthText: {
      ...theme.typography.labelSmall,
      fontWeight: '600',
    },
    meter: {
      marginBottom: theme.spacing.sm,
    },
    meterBackground: {
      height: 4,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 2,
    },
    meterFill: {
      height: 4,
      borderRadius: 2,
      marginRight: theme.spacing.sm,
    },
    requirementsList: {
      marginBottom: theme.spacing.small,
    },
    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    requirementIcon: {
      marginRight: theme.spacing.small,
    },
    requirementText: {
      ...theme.typography.bodySmall,
      flex: 1,
    },
  });

export default PasswordStrengthIndicator; 