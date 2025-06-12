import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../providers/ThemeProvider';
import { useGlobalError } from '../../providers/GlobalErrorProvider';
import { useToast } from '../../providers/ToastProvider';
import { useUserProfile } from '../../shared/hooks/useUserProfile';
import { getPrimaryShadow } from '@/themes/utils';

import type { AppTheme } from '../../themes/types';

interface AccountSettingsProps {
  onLogout: () => void;
  username?: string | null;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ onLogout, username }) => {
  const { theme } = useTheme();
  const { showError } = useGlobalError();
  const { showError: showToastError } = useToast();
  const { deleteAccount, isDeletingAccount } = useUserProfile();
  const styles = createStyles(theme);

  const handleLogoutPress = () => {
    // The confirmation alert was removed to fully adopt the global error/toast system.
    // A custom confirmation modal should be implemented as a follow-up task.
    try {
      onLogout();
    } catch {
      // 🛡️ ERROR PROTECTION: Handle logout errors gracefully
      showError('Çıkış işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem kalıcıdır ve geri alınamaz. Tüm verileriniz silinecektir. Devam etmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: confirmAccountDeletion,
        },
      ]
    );
  };

  const confirmAccountDeletion = () => {
    deleteAccount(undefined, {
      onSuccess: (data) => {
        showToastError(data.message || 'Hesabınız başarıyla silindi.');
      },
      onError: (_error) => {
        showToastError(
          'Hesap silme işlemi başarısız oldu. Lütfen tekrar deneyin veya destek ile iletişime geçin.'
        );
      },
    });
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

      {/* KVKK Compliance: Account Deletion */}
      <View style={styles.deleteButton}>
        <TouchableOpacity
          style={styles.deleteContent}
          onPress={handleDeleteAccountPress}
          disabled={isDeletingAccount}
        >
          <View style={styles.deleteIconContainer}>
            <Icon
              name={isDeletingAccount ? 'loading' : 'delete-forever'}
              size={20}
              color={theme.colors.error}
            />
          </View>
          <View style={styles.deleteTextContainer}>
            <Text style={styles.deleteButtonText}>
              {isDeletingAccount ? 'Hesap Siliniyor...' : 'Hesabımı Sil'}
            </Text>
            <Text style={styles.deleteWarningText}>Kalıcı işlem - geri alınamaz</Text>
          </View>
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
      marginBottom: theme.spacing.sm,
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
    deleteButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
      // 🌟 Medium primary shadow for consistency
      ...getPrimaryShadow.medium(theme),
    },
    deleteContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
    },
    deleteIconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.errorContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    deleteTextContainer: {
      flex: 1,
    },
    deleteButtonText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.error,
      fontWeight: '600',
    },
    deleteWarningText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      marginTop: theme.spacing.xs / 2,
    },
  });

export default AccountSettings;
