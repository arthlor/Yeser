import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThemedCard from '@/components/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface DailyEntryDatePickerProps {
  entryDate: Date;
  onPressChangeDate: () => void;
}

const DailyEntryDatePicker: React.FC<DailyEntryDatePickerProps> = ({ entryDate, onPressChangeDate }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const formattedDate = entryDate.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <View style={styles.dateCardContainer}>
      <ThemedCard style={styles.dateCard}>
        <View style={styles.dateInfoContainer}>
          <Icon name="calendar-month" size={28} color={theme.colors.primary} style={styles.dateIcon} />
          <View>
            <Text style={styles.dateLabel}>Seçili Tarih</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onPressChangeDate} style={styles.changeDateButton}>
          <Text style={styles.changeDateButtonText}>Tarihi Değiştir</Text>
          <Icon name="chevron-down" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </ThemedCard>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    dateCardContainer: {
      marginBottom: theme.spacing.lg,
      marginHorizontal: theme.spacing.md, // Consistent with list padding
    },
    dateCard: {
      padding: theme.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    dateInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateIcon: {
      marginRight: theme.spacing.md,
    },
    dateLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamilyRegular,
      marginBottom: 2,
    },
    dateText: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamilyBold,
    },
    changeDateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryContainer,
    },
    changeDateButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '600',
      marginRight: theme.spacing.xs,
      fontFamily: theme.typography.fontFamilyMedium,
    },
  });

export default DailyEntryDatePicker;