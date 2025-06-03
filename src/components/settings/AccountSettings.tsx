import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../providers/ThemeProvider';
import ThemedCard from '../ThemedCard';

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
    <ThemedCard style={styles.card}>
      {username && (
        <View style={styles.userInfoContainer}>
          <Icon name="account-circle-outline" size={24} color={theme.colors.textSecondary} />
          <Text style={styles.usernameText}>{username}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
        <Icon name="logout" size={22} color={theme.colors.error} style={styles.logoutIcon} />
        <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ThemedCard>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.medium,
    },
    userInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.medium,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.medium,
    },
    usernameText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamilyRegular,
      marginLeft: theme.spacing.small,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.medium,
    },
    logoutIcon: {
      marginRight: theme.spacing.small,
    },
    logoutButtonText: {
      fontSize: 16,
      color: theme.colors.error,
      fontFamily: theme.typography.fontFamilyRegular,
    },
  });

export default AccountSettings;
