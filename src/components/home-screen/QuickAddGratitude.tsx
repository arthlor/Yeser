import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '@/themes/types';
import { useTheme } from '@/providers/ThemeProvider';
import GratitudeInputBar from '@/components/GratitudeInputBar';

interface QuickAddGratitudeProps {
  onSubmit: (text: string) => Promise<void>;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    quickAddSection: {
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg, // Or as needed for layout
      marginBottom: theme.spacing.md,
    } as ViewStyle,
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    } as ViewStyle,
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    sectionTitle: {
      ...theme.typography.titleLarge, // Matches EnhancedHomeScreen usage
      color: theme.colors.onBackground,
      marginLeft: theme.spacing.sm,
      fontWeight: '600',
    } as TextStyle,
    sectionSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      // No specific alignment needed if it's on the right of the header
    } as TextStyle,
  });

const QuickAddGratitude: React.FC<QuickAddGratitudeProps> = ({ onSubmit }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.quickAddSection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Icon name="plus-circle-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Hızlı Ekle</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Minnetini hemen paylaş</Text>
      </View>
      <GratitudeInputBar onSubmit={onSubmit} />
    </View>
  );
};

export default QuickAddGratitude;
