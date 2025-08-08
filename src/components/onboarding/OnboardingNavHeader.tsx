import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';

interface OnboardingNavHeaderProps {
  onBack?: () => void;
  hideBackText?: boolean;
}

export const OnboardingNavHeader: React.FC<OnboardingNavHeaderProps> = ({
  onBack,
  hideBackText = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!onBack) {
    return <View style={styles.spacer} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        activeOpacity={0.7}
        accessibilityLabel="Geri dön"
        accessibilityRole="button"
        accessibilityHint="Önceki adıma geri dön"
      >
        <Ionicons name="arrow-back" size={18} color={theme.colors.onSurface} />
        {!hideBackText && <Text style={styles.backText}>Geri</Text>}
      </TouchableOpacity>
      <View style={styles.rightSpacer} />
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: theme.spacing.sm,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
    },
    backText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    rightSpacer: {
      width: 32,
      height: 1,
    },
    spacer: {
      height: theme.spacing.sm,
    },
  });

export default OnboardingNavHeader;
