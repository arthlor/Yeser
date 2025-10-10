import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  leftComponent?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: ViewStyle;
  subtitleStyle?: ViewStyle;
  variant?: 'default' | 'large' | 'minimal';
}

/**
 * Standardized screen header component that provides:
 * - Consistent spacing and typography
 * - Optional back button
 * - Flexible left/right components
 * - Multiple size variants
 * - Proper touch targets
 */
const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightComponent,
  leftComponent,
  style,
  titleStyle,
  subtitleStyle,
  variant = 'default',
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, variant);
  const { t } = useTranslation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Left Section */}
      <View style={styles.leftSection}>
        {showBackButton ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Icon name="arrow-left" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
        ) : leftComponent ? (
          leftComponent
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Center Section */}
      <View style={styles.centerSection}>
        {title && (
          <Text style={[styles.title, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Section */}
      <View style={styles.rightSection}>
        {rightComponent || <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme, variant: 'default' | 'large' | 'minimal') => {
  const isLarge = variant === 'large';
  const isMinimal = variant === 'minimal';

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.page,
      paddingVertical: isMinimal ? theme.spacing.sm : theme.spacing.md,
      minHeight: isLarge ? 80 : isMinimal ? 44 : 56,
      backgroundColor: theme.colors.surface,
    },
    leftSection: {
      width: 44,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    centerSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    rightSection: {
      width: 44,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
    },
    placeholder: {
      width: 44,
      height: 44,
    },
    title: {
      fontSize: isLarge ? 24 : 18,
      fontWeight: isLarge ? '700' : '600',
      fontFamily: isLarge ? 'Lora-Medium' : 'Lora-Regular',
      color: theme.colors.onBackground,
      textAlign: 'center',
      letterSpacing: isLarge ? -0.5 : 0,
      lineHeight: isLarge ? 28 : 22,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
      lineHeight: 18,
    },
  });
};

export default ScreenHeader;
