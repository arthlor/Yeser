import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';
import OnboardingProgressDots from './OnboardingProgressDots';

interface OnboardingNavHeaderProps {
  onBack?: () => void;
  hideBackText?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export const OnboardingNavHeader: React.FC<OnboardingNavHeaderProps> = ({
  onBack,
  hideBackText = false,
  currentStep,
  totalSteps,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  // If there's no back button and no progress dots, render a simple spacer
  if (!onBack && currentStep === undefined) {
    return <View style={styles.spacer} />;
  }

  const showDots = currentStep !== undefined && totalSteps !== undefined;

  return (
    <View style={styles.container}>
      {/* Left section: Back button or placeholder spacer */}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          accessibilityHint={t('onboarding.backHint') || ''}
        >
          <Feather name="chevron-left" size={20} color={theme.colors.onSurface} strokeWidth={2.5} />
          {!hideBackText && <Text style={styles.backText}>{t('common.back')}</Text>}
        </TouchableOpacity>
      ) : (
        <View style={styles.backPlaceholder} />
      )}

      {/* Center section: Progress Dots */}
      {showDots && (
        <View style={styles.dotsContainer} pointerEvents="none">
          <OnboardingProgressDots total={totalSteps} current={currentStep} />
        </View>
      )}

      {/* Right section: Balanced spacer */}
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
      position: 'relative',
      minHeight: 40,
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
      zIndex: 1,
    },
    backPlaceholder: {
      width: 44,
      height: 32,
    },
    backText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    dotsContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 0,
    },
    rightSpacer: {
      width: 44,
      height: 1,
    },
    spacer: {
      height: theme.spacing.sm,
    },
  });

export default OnboardingNavHeader;
