import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface PastEntriesEmptyStateProps {
  onCreateEntry: () => void;
}

const PastEntriesEmptyState: React.FC<PastEntriesEmptyStateProps> = ({ onCreateEntry }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Icon name="book-heart-outline" size={56} color={theme.colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>İlk minnet kaydınızı oluşturun</Text>

        {/* Description */}
        <Text style={styles.description}>
          Günlük minnet kayıtlarınız burada görünecek. Mutluluğunuzu artırmak ve hayatınızdaki güzel
          anları hatırlamak için ilk kaydınızı oluşturun.
        </Text>

        {/* Call to Action */}
        <TouchableOpacity
          style={styles.button}
          onPress={onCreateEntry}
          activeOpacity={0.8}
          accessibilityLabel="İlk minnet kaydını oluştur"
          accessibilityHint="Günlük giriş ekranına gider"
        >
          <Icon name="plus" size={16} color={theme.colors.onPrimary} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>İlk Kaydını Oluştur</Text>
        </TouchableOpacity>

        {/* Help text */}
        <Text style={styles.helpText}>💡 Günlük 3-5 minnet kaydı tutmak mutluluğunuzu artırır</Text>
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
      maxWidth: 300,
    },
    iconContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: theme.colors.primaryContainer + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: 19,
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      letterSpacing: -0.2,
      marginBottom: theme.spacing.md,
    },
    description: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: theme.spacing.xl,
      letterSpacing: 0.05,
      opacity: 0.9,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      minWidth: 170,
      justifyContent: 'center',
    },
    buttonIcon: {
      marginRight: theme.spacing.sm,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.onPrimary,
      letterSpacing: 0.1,
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

export default PastEntriesEmptyState;
