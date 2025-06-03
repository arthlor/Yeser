import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';

import GratitudeInputBar from '@/components/GratitudeInputBar';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface QuickAddGratitudeProps {
  onSubmit: (text: string) => Promise<void>;
  isLoading?: boolean;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
    } as ViewStyle,
    quickAddSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    } as ViewStyle,
    headerContainer: {
      marginBottom: theme.spacing.lg,
    } as ViewStyle,
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.onBackground,
      letterSpacing: -0.2,
      marginBottom: 4,
    } as TextStyle,
    sectionSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.1,
    } as TextStyle,
    inputContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '40',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    } as ViewStyle,
    tipsContainer: {
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
    } as ViewStyle,
    tipsText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 16,
      letterSpacing: 0.1,
      opacity: 0.8,
    } as TextStyle,
  });

const QuickAddGratitude: React.FC<QuickAddGratitudeProps> = ({ onSubmit, isLoading = false }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (isSubmitting || isLoading) return;

      setIsSubmitting(true);
      try {
        await onSubmit(text);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, isSubmitting, isLoading]
  );

  const isDisabled = isSubmitting || isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.quickAddSection}>
        {/* Clean Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>Hızlı Ekle</Text>
          <Text style={styles.sectionSubtitle}>Bugünkü şükranınızı buraya yazın</Text>
        </View>

        {/* Clean Input Container */}
        <View style={styles.inputContainer}>
          <GratitudeInputBar
            onSubmit={handleSubmit}
            placeholder="Bugün neye minnettarsın?"
            buttonText={isDisabled ? 'Kaydediliyor...' : 'Kaydet'}
            disabled={isDisabled}
            disableKeyboardAnimation
          />
        </View>

        {/* Simple Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsText}>Sahip olduğunuz küçük güzellikleri düşünün</Text>
        </View>
      </View>
    </View>
  );
};

export default QuickAddGratitude;
