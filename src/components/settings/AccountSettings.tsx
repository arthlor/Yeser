import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';

import type { AppTheme } from '../../themes/types';

interface AccountSettingsProps {
  onLogout: () => void;
  username?: string | null;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ onLogout, username }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const handleLogoutPress = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: onLogout,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {username && (
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Icon name="account-circle" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.usernameLabel}>Kullanıcı Adı</Text>
              <Text style={styles.usernameText}>{username}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.logoutButton}>
        <TouchableOpacity style={styles.logoutContent} onPress={handleLogoutPress}>
          <View style={styles.logoutIconContainer}>
            <Icon name="logout" size={20} color={theme.colors.error} />
          </View>
          <Text style={styles.logoutButtonText}>Hesaptan Çıkış Yap</Text>
          <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      // Remove container margins - let cards handle their own spacing like SettingsScreen
    },
    userCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      // 🌟 Medium primary shadow for user profile card - matches SettingsScreen pattern
      ...getPrimaryShadow.medium(theme),
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    avatarContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    userDetails: {
      flex: 1,
    },
    usernameLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xs / 2,
    },
    usernameText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    logoutButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.md,
      // 🌟 Medium primary shadow for consistency with user card - matches SettingsScreen pattern
      ...getPrimaryShadow.medium(theme),
    },
    logoutContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
    },
    logoutIconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.errorContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    logoutButtonText: {
      flex: 1,
      ...theme.typography.bodyLarge,
      color: theme.colors.error,
      fontWeight: '600',
    },
  });

export default AccountSettings;
