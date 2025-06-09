import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedButton from '@/shared/components/ui/ThemedButton';

interface ScreenContentProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
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
 */
const ScreenContent: React.FC<ScreenContentProps> = ({
  children,
  isLoading = false,
  isEmpty = false,
  error = null,
  loadingText = 'Yükleniyor...',
  emptyTitle = 'Henüz içerik yok',
  emptySubtitle = 'İçerik eklendiğinde burada görünecek',
  emptyIcon = '📄',
  emptyComponent,
  errorTitle = 'Bir hata oluştu',
  errorSubtitle = 'Lütfen tekrar deneyin',
  onRetry,
  retryText = 'Tekrar Dene',
  style,
  contentStyle,
  centerContent = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, centerContent);

  // Loading State
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centeredContainer, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {loadingText && <Text style={styles.loadingText}>{loadingText}</Text>}
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={[styles.container, styles.centeredContainer, style]}>
        <View style={styles.stateContainer}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>{errorTitle}</Text>
          <Text style={styles.stateSubtitle}>{error || errorSubtitle}</Text>
          {onRetry && (
            <ThemedButton
              title={retryText}
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
            <Text style={styles.stateTitle}>{emptyTitle}</Text>
            <Text style={styles.stateSubtitle}>{emptySubtitle}</Text>
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
