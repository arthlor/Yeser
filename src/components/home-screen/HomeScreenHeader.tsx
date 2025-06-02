import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '@/themes/types'; // Adjusted path
import { useTheme } from '@/providers/ThemeProvider'; // Adjusted path

interface HomeScreenHeaderProps {
  greeting: string;
  username?: string | null;
  onNavigateToSettings: () => void;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.background,
    } as ViewStyle,
    greetingContainer: {
      flex: 1,
    } as ViewStyle,
    greeting: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    } as TextStyle,
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    } as TextStyle,
    profileIconContainer: {
      padding: theme.spacing.xs,
      borderRadius: 20, // Consider making this part of theme.borderRadius if used elsewhere
    } as ViewStyle,
  });

const HomeScreenHeader: React.FC<HomeScreenHeaderProps> = ({
  greeting,
  username,
  onNavigateToSettings,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.userName}>
          {username || 'Yeşeren Kullanıcı'}!
        </Text>
      </View>
      <TouchableOpacity
        onPress={onNavigateToSettings}
        style={styles.profileIconContainer}
      >
        <Icon
          name="account-circle-outline"
          size={32}
          color={theme.colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreenHeader;
