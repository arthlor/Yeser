import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';

interface NotificationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  enabled,
  onToggle,
  isLoading,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.settingCard}>
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <View style={styles.iconContainer}>
            <Icon name="bell-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>Bildirimler</Text>
            <Text style={styles.settingDescription}>
              Günde 4 hatırlatıcı: (12:00, 14:00, 19:00, 21:00)
            </Text>
          </View>
        </View>
        <View style={styles.actionContainer}>
          <ThemedSwitch value={enabled} onValueChange={onToggle} disabled={isLoading} />
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      // 🌟 Medium primary shadow for inline setting cards
      ...getPrimaryShadow.medium(theme),
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    textContainer: {
      flex: 1,
    },
    settingTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
    },
    settingDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    actionContainer: {
      marginLeft: theme.spacing.sm,
    },
  });

export default NotificationToggle;
