import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../themes/types';
import { semanticSpacing, semanticTypography, textColors } from '../../../themes/utils';
import ThemedButton from './ThemedButton';

type ErrorType = 'network' | 'server' | 'notFound' | 'permission' | 'validation' | 'generic';

interface ErrorStateProps {
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
  type = 'generic',
  title,
  message,
  icon,
  onRetry,
  onGoBack,
  onContactSupport,
  retryText = 'Tekrar Dene',
  showGoBack = false,
  showContactSupport = false,
  style,
  compact = false,
}) => {
  const { theme } = useTheme();
  const errorConfig = getErrorConfig(type);
  const styles = createStyles(theme, compact);

  const finalTitle = title || errorConfig.title;
  const finalMessage = message || errorConfig.message;
  const finalIcon = icon || errorConfig.icon;

  return (
    <View style={[styles.container, style]}>
      {/* Error Icon */}
      <View style={styles.iconContainer}>
        <Icon
          name={finalIcon}
          size={compact ? 32 : 48}
          color={theme.colors.error}
          accessibilityRole="image"
          accessibilityLabel="Error icon"
        />
      </View>

      {/* Error Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text 
          style={styles.title}
          accessibilityRole="header"
        >
          {finalTitle}
        </Text>

        {/* Message */}
        <Text 
          style={styles.message}
          accessibilityRole="text"
        >
          {finalMessage}
        </Text>
      </View>

      {/* Action Buttons */}
      {(onRetry || onGoBack || onContactSupport) && (
        <View style={styles.actions}>
          {/* Primary action - Retry */}
          {onRetry && (
                         <ThemedButton
               title={retryText}
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
                title="Geri Dön"
                onPress={onGoBack}
                variant="outline"
                size={compact ? 'compact' : 'standard'}
                iconLeft="arrow-left"
                style={styles.secondaryAction}

              />
            )}

            {showContactSupport && onContactSupport && (
              <ThemedButton
                title="Destek Al"
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
  const configs = {
    network: {
      title: 'Bağlantı Sorunu',
      message: 'İnternet bağlantınızı kontrol edip tekrar deneyin.',
      icon: 'wifi-off',
    },
    server: {
      title: 'Sunucu Hatası',
      message: 'Şu anda bir teknik sorun yaşıyoruz. Lütfen daha sonra tekrar deneyin.',
      icon: 'server-network-off',
    },
    notFound: {
      title: 'Sayfa Bulunamadı',
      message: 'Aradığınız sayfa mevcut değil veya taşınmış olabilir.',
      icon: 'file-question-outline',
    },
    permission: {
      title: 'Erişim Yetkisi Yok',
      message: 'Bu içeriği görüntülemek için gerekli izniniz bulunmuyor.',
      icon: 'lock-outline',
    },
    validation: {
      title: 'Geçersiz Veri',
      message: 'Girdiğiniz bilgileri kontrol edip tekrar deneyin.',
      icon: 'alert-circle-outline',
    },
    generic: {
      title: 'Bir Hata Oluştu',
      message: 'Beklenmedik bir sorun oluştu. Lütfen tekrar deneyin.',
      icon: 'alert-outline',
    },
  };

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
      ...typography.content.headline.small,
      color: colors.primary,
      textAlign: 'center',
      marginBottom: spacing.elementGap,
    },

    message: {
      ...typography.content.body.medium,
      color: colors.secondary,
      textAlign: 'center',
      lineHeight: 22,
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