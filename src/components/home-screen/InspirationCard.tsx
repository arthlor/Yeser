import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme, AppTheme } from '@/providers/ThemeProvider';

import ThemedCard from '../ThemedCard';

interface InspirationCardProps {
  title: string;
  message: string;
}

const InspirationCard: React.FC<InspirationCardProps> = ({ title, message }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.inspirationSection}>
      <ThemedCard style={styles.inspirationCard}>
        <View style={styles.inspirationContent}>
          <View style={styles.inspirationIconContainer}>
            <Icon name="lightbulb-on-outline" size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.inspirationTextContainer}>
            <Text style={styles.inspirationTitle}>{title}</Text>
            <Text style={styles.inspirationText}>{message}</Text>
          </View>
        </View>
      </ThemedCard>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    inspirationSection: {
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
    },
    inspirationCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
    },
    inspirationContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    inspirationIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${theme.colors.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    inspirationTextContainer: {
      flex: 1,
    },
    inspirationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    inspirationText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 21,
    },
  });

export default InspirationCard;
