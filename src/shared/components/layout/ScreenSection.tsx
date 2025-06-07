import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme } from '@/themes/types';

interface ScreenSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerComponent?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: ViewStyle;
  subtitleStyle?: ViewStyle;
  spacing?: 'none' | 'small' | 'medium' | 'large';
  variant?: 'default' | 'card' | 'minimal' | 'edge-to-edge';
  showDivider?: boolean;
}

/**
 * Standardized screen section component that provides:
 * - Consistent section spacing
 * - Optional section titles and subtitles
 * - Multiple visual variants (default, card, minimal)
 * - Configurable spacing options
 * - Optional dividers
 * - Flexible header components
 */
const ScreenSection: React.FC<ScreenSectionProps> = ({
  children,
  title,
  subtitle,
  headerComponent,
  style,
  contentStyle,
  titleStyle,
  subtitleStyle,
  spacing = 'medium',
  variant = 'default',
  showDivider = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, spacing, variant);

  const hasHeader = title || subtitle || headerComponent;

  return (
    <View style={[styles.container, style]}>
      {/* Section Header */}
      {hasHeader && (
        <View style={styles.header}>
          {headerComponent ? (
            headerComponent
          ) : (
            <>
              {title && (
                <Text style={[styles.title, titleStyle]}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitle, subtitleStyle]}>
                  {subtitle}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Section Content */}
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>

      {/* Optional Divider */}
      {showDivider && <View style={styles.divider} />}
    </View>
  );
};

const createStyles = (
  theme: AppTheme,
  spacing: 'none' | 'small' | 'medium' | 'large',
  variant: 'default' | 'card' | 'minimal' | 'edge-to-edge'
) => {
  // Spacing values
  const spacingMap = {
    none: 0,
    small: theme.spacing.md,
    medium: theme.spacing.lg,
    large: theme.spacing.section,
  };

  const sectionSpacing = spacingMap[spacing];

  // Variant styles
  const getContainerStyle = () => {
    const baseStyle = {
      marginBottom: sectionSpacing,
    };

    switch (variant) {
      case 'card':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginHorizontal: theme.spacing.edge,
          ...getPrimaryShadow.card(theme),
        };
      case 'edge-to-edge':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.surface,
          borderRadius: 0,
          padding: theme.spacing.md,
          marginHorizontal: 0,
          ...getPrimaryShadow.small(theme),
        };
      case 'minimal':
        return {
          ...baseStyle,
          paddingHorizontal: theme.spacing.page,
        };
      case 'default':
      default:
        return {
          ...baseStyle,
          paddingHorizontal: theme.spacing.page,
        };
    }
  };

  return StyleSheet.create({
    container: getContainerStyle(),
    header: {
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.3,
      lineHeight: 24,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    content: {
      // Content styling is handled by the contentStyle prop
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '30',
      marginTop: sectionSpacing,
      marginHorizontal: variant === 'card' ? -theme.spacing.lg : 0,
    },
  });
};

export default ScreenSection; 