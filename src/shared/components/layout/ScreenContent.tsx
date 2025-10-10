import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { safeErrorDisplay } from '@/utils/errorTranslation';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import { useTranslation } from 'react-i18next';

interface ScreenContentProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  errorObject?: unknown;
  loadingText?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: string;
  emptyComponent?: React.ReactNode;
  errorTitle?: string;
  errorSubtitle?: string;
  onRetry?: () => void;
  retryText?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  centerContent?: boolean;
}

/**
 * Standardized screen content component that handles:
 * - Loading states with spinner and optional text
 * - Empty states with customizable messages and icons
 * - Error states with retry functionality
 * - Consistent spacing and typography
 * - Centered or default content layout
 * - Raw error object translation (new feature)
 */
const ScreenContent: React.FC<ScreenContentProps> = ({
  children,
  isLoading = false,
  isEmpty = false,
  error = null,
  errorObject,
  loadingText,
  emptyTitle,
  emptySubtitle,
  emptyIcon = '📄',
  emptyComponent,
  errorTitle,
  errorSubtitle,
  onRetry,
  retryText,
  style,
  contentStyle,
  centerContent = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, centerContent);
  const { t } = useTranslation();

  // Defaults via i18n if props not overridden
  const i18nLoadingText = loadingText ?? t('shared.layout.screenContent.loading');
  const i18nEmptyTitle = emptyTitle ?? t('shared.layout.screenContent.emptyTitle');
  const i18nEmptySubtitle = emptySubtitle ?? t('shared.layout.screenContent.emptySubtitle');
  const i18nErrorTitle = errorTitle ?? t('shared.layout.screenContent.errorTitle');
  const i18nErrorSubtitle = errorSubtitle ?? t('shared.layout.screenContent.errorSubtitle');
  const i18nRetryText = retryText ?? t('common.retry');

  // Calculate the final error message
  const finalErrorMessage = errorObject ? safeErrorDisplay(errorObject) : error;

  // Loading State
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centeredContainer, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {i18nLoadingText && <Text style={styles.loadingText}>{i18nLoadingText}</Text>}
      </View>
    );
  }

  // Error State
  if (finalErrorMessage) {
    return (
      <View style={[styles.container, styles.centeredContainer, style]}>
        <View style={styles.stateContainer}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>{i18nErrorTitle}</Text>
          <Text style={styles.stateSubtitle}>{finalErrorMessage || i18nErrorSubtitle}</Text>
          {onRetry && (
            <ThemedButton
              title={i18nRetryText}
              onPress={onRetry}
              variant="outline"
              style={styles.retryButton}
            />
          )}
        </View>
      </View>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <View style={[styles.container, styles.centeredContainer, style]}>
        {emptyComponent || (
          <View style={styles.stateContainer}>
            <Text style={styles.stateIcon}>{emptyIcon}</Text>
            <Text style={styles.stateTitle}>{i18nEmptyTitle}</Text>
            <Text style={styles.stateSubtitle}>{i18nEmptySubtitle}</Text>
          </View>
        )}
      </View>
    );
  }

  // Content State
  return (
    <View style={[styles.container, centerContent && styles.centeredContainer, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const createStyles = (theme: AppTheme, _centerContent: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centeredContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.page,
    },
    content: {
      flex: 1,
    },
    stateContainer: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      maxWidth: 320,
    },
    stateIcon: {
      fontSize: 48,
      marginBottom: theme.spacing.lg,
    },
    stateTitle: {
      fontFamily: 'Lora-Medium',
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      letterSpacing: -0.3,
      lineHeight: 24,
    },
    stateSubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.xl,
    },
    loadingText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.lg,
      textAlign: 'center',
    },
    retryButton: {
      minWidth: 120,
    },
  });

export default ScreenContent;
