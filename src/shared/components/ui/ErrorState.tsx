import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../themes/types';
import { semanticSpacing, semanticTypography, textColors } from '../../../themes/utils';
import { safeErrorDisplay } from '@/utils/errorTranslation';
import ThemedButton from './ThemedButton';
import { useTranslation } from 'react-i18next';

type ErrorType = 'network' | 'server' | 'notFound' | 'permission' | 'validation' | 'generic';

interface ErrorStateProps {
  error?: unknown;
  type?: ErrorType;
  title?: string;
  message?: string;
  icon?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  onContactSupport?: () => void;
  retryText?: string;
  showGoBack?: boolean;
  showContactSupport?: boolean;
  style?: ViewStyle;
  compact?: boolean;
}

/**
 * 🎯 ENHANCED ERROR STATE COMPONENT
 * Beautiful, actionable error states with contextual help and recovery options
 *
 * Features:
 * - Pre-configured error types with appropriate messaging
 * - Multiple recovery actions (retry, go back, contact support)
 * - Beautiful visual hierarchy with semantic typography
 * - Compact mode for inline error display
 * - Contextual icons and messaging
 * - Accessibility optimized
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  type = 'generic',
  title,
  message,
  icon,
  onRetry,
  onGoBack,
  onContactSupport,
  retryText,
  showGoBack = false,
  showContactSupport = false,
  style,
  compact = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const errorConfig = getErrorConfig(type);
  const styles = createStyles(theme, compact);

  const translatedErrorMessage = error ? safeErrorDisplay(error) : null;

  const finalTitle = title || t(errorConfig.title);
  const finalMessage = translatedErrorMessage || message || t(errorConfig.message);
  const finalIcon = icon || errorConfig.icon;
  const finalRetryText = retryText || t('common.retry');

  return (
    <View style={[styles.container, style]}>
      {/* Error Icon */}
      <View style={styles.iconContainer}>
        <Icon
          name={finalIcon}
          size={compact ? 32 : 48}
          color={theme.colors.error}
          accessibilityRole="image"
          accessibilityLabel={t('shared.ui.accessibility.errorIcon')}
        />
      </View>

      {/* Error Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} accessibilityRole="header">
          {finalTitle}
        </Text>

        {/* Message */}
        <Text style={styles.message} accessibilityRole="text">
          {finalMessage}
        </Text>
      </View>

      {/* Action Buttons */}
      {(onRetry || onGoBack || onContactSupport) && (
        <View style={styles.actions}>
          {/* Primary action - Retry */}
          {onRetry && (
            <ThemedButton
              title={finalRetryText}
              onPress={onRetry}
              variant="primary"
              size={compact ? 'compact' : 'standard'}
              iconLeft="refresh"
              style={styles.primaryAction}
            />
          )}

          {/* Secondary actions */}
          <View style={styles.secondaryActions}>
            {showGoBack && onGoBack && (
              <ThemedButton
                title={t('shared.layout.errorState.back')}
                onPress={onGoBack}
                variant="outline"
                size={compact ? 'compact' : 'standard'}
                iconLeft="arrow-left"
                style={styles.secondaryAction}
              />
            )}

            {showContactSupport && onContactSupport && (
              <ThemedButton
                title={t('common.ok')}
                onPress={onContactSupport}
                variant="ghost"
                size={compact ? 'compact' : 'standard'}
                iconLeft="help-circle-outline"
                style={styles.secondaryAction}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * 🎨 ERROR TYPE CONFIGURATIONS
 * Pre-configured error states with appropriate messaging and icons
 */
const getErrorConfig = (type: ErrorType) => {
  // Titles/messages are localized at render time via i18n keys in shared.layout.errorState
  const configs = {
    network: {
      title: 'shared.layout.errorState.cases.network.title',
      message: 'shared.layout.errorState.cases.network.message',
      icon: 'wifi-off',
    },
    server: {
      title: 'shared.layout.errorState.cases.server.title',
      message: 'shared.layout.errorState.cases.server.message',
      icon: 'server-network-off',
    },
    notFound: {
      title: 'shared.layout.errorState.cases.notFound.title',
      message: 'shared.layout.errorState.cases.notFound.message',
      icon: 'file-question-outline',
    },
    permission: {
      title: 'shared.layout.errorState.cases.forbidden.title',
      message: 'shared.layout.errorState.cases.forbidden.message',
      icon: 'lock-outline',
    },
    validation: {
      title: 'shared.layout.errorState.cases.validation.title',
      message: 'shared.layout.errorState.cases.validation.message',
      icon: 'alert-circle-outline',
    },
    generic: {
      title: 'shared.layout.errorState.cases.generic.title',
      message: 'shared.layout.errorState.cases.generic.message',
      icon: 'alert-outline',
    },
  } as const;

  return configs[type] || configs.generic;
};

/**
 * 🎨 ERROR STATE STYLING
 * Beautiful, accessible styling with semantic typography
 */
const createStyles = (theme: AppTheme, compact: boolean) => {
  const spacing = semanticSpacing(theme);
  const typography = semanticTypography(theme);
  const colors = textColors(theme);

  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: compact ? spacing.cardPadding : spacing.majorGap,
      minHeight: compact ? undefined : 200,
    },

    iconContainer: {
      marginBottom: compact ? spacing.contentGap : spacing.sectionGap,
      alignItems: 'center',
      justifyContent: 'center',
      width: compact ? 48 : 72,
      height: compact ? 48 : 72,
      borderRadius: compact ? 24 : 36,
      backgroundColor: theme.colors.errorContainer + '20',
    },

    content: {
      alignItems: 'center',
      marginBottom: compact ? spacing.contentGap : spacing.sectionGap,
      maxWidth: 320, // Prevent overly wide text on large screens
    },

    title: {
      fontFamily: 'Lora-Medium',
      fontSize: typography.content.headline.small.fontSize,
      fontWeight: '600',
      lineHeight: typography.content.headline.small.lineHeight,
      letterSpacing: typography.content.headline.small.letterSpacing,
      color: colors.primary,
      textAlign: 'center',
      marginBottom: spacing.elementGap,
    },

    message: {
      fontFamily: 'Inter-Regular',
      fontSize: typography.content.body.medium.fontSize,
      fontWeight: typography.content.body.medium.fontWeight,
      lineHeight: 22,
      letterSpacing: typography.content.body.medium.letterSpacing,
      color: colors.secondary,
      textAlign: 'center',
    },

    actions: {
      width: '100%',
      alignItems: 'center',
    },

    primaryAction: {
      marginBottom: spacing.contentGap,
      minWidth: compact ? 120 : 160,
    },

    secondaryActions: {
      flexDirection: compact ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.contentGap,
    },

    secondaryAction: {
      minWidth: compact ? 120 : 140,
    },
  });
};

/**
 * 🏗️ PRESET ERROR COMPONENTS
 * Pre-configured error states for common scenarios
 */

// Network error
export const NetworkError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState type="network" showContactSupport {...props} />
);

// Server error
export const ServerError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState type="server" showContactSupport {...props} />
);

// Not found error
export const NotFoundError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState type="notFound" showGoBack {...props} />
);

// Permission error
export const PermissionError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState type="permission" showGoBack showContactSupport {...props} />
);

// Validation error (compact by default)
export const ValidationError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState type="validation" compact {...props} />
);

// Generic retry error
export const RetryError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState type="generic" showContactSupport {...props} />
);

export default ErrorState;
