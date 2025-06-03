import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface PastEntriesErrorStateProps {
  error: string;
  onRetry: () => void;
}

const PastEntriesErrorState: React.FC<PastEntriesErrorStateProps> = ({ error, onRetry }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Icon name="alert-circle-outline" size={48} color={theme.colors.error} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Bir sorun oluştu</Text>

        {/* Error Message */}
        <Text style={styles.errorMessage}>{error}</Text>

        {/* Retry Button */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
          accessibilityLabel="Yeniden dene"
          accessibilityHint="Kayıtları yeniden yüklemeyi dener"
        >
          <Icon
            name="refresh"
            size={16}
            color={theme.colors.onErrorContainer}
            style={styles.buttonIcon}
          />
          <Text style={styles.retryButtonText}>Yeniden Dene</Text>
        </TouchableOpacity>

        {/* Help text */}
        <Text style={styles.helpText}>İnternet bağlantınızı kontrol edin ve tekrar deneyin</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
    },
    content: {
      alignItems: 'center',
      maxWidth: 280,
    },
    iconContainer: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: theme.colors.errorContainer + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      letterSpacing: -0.1,
      marginBottom: theme.spacing.sm,
    },
    errorMessage: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: theme.spacing.xl,
      letterSpacing: 0.05,
      opacity: 0.9,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.errorContainer,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
      minWidth: 130,
      justifyContent: 'center',
    },
    buttonIcon: {
      marginRight: theme.spacing.sm,
    },
    retryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onErrorContainer,
      letterSpacing: 0.05,
    },
    helpText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      opacity: 0.6,
      letterSpacing: 0.05,
    },
  });

export default PastEntriesErrorState;
