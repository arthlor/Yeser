import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface DailyEntryHeroProps {
  isToday: boolean;
  statementCount: number;
}

const DailyEntryHero: React.FC<DailyEntryHeroProps> = ({ isToday, statementCount }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.heroSection}>
      <View style={styles.heroIconContainer}>
        <Icon name="heart" size={32} color={theme.colors.primary} />
      </View>
      <Text style={styles.heroTitle}>
        {isToday ? 'Bugün Neler İçin Minnettarsın?' : 'O Gün Neler İçin Minnettar Oldun?'}
      </Text>
      <Text style={styles.heroSubtitle}>
        {statementCount === 0
          ? 'İlk şükran ifadeni ekleyerek başla'
          : `${statementCount} şükran ifaden var`}
      </Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    heroSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface, // Or a specific hero background
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
      elevation: 1, // Subtle shadow for Android
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    heroIconContainer: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 50,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      fontFamily: theme.typography.fontFamilyBold,
    },
    heroSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamilyRegular,
    },
  });

export default DailyEntryHero;